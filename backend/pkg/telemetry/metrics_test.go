package telemetry

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/metric"
	sdkmetric "go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/metric/metricdata"
)

// TestResponseWriter tests the custom response writer implementation
func TestResponseWriter(t *testing.T) {
	recorder := httptest.NewRecorder()

	writer := newResponseWriter(recorder)

	assert.Equal(t, http.StatusOK, writer.statusCode)

	writer.WriteHeader(http.StatusNotFound)

	assert.Equal(t, http.StatusNotFound, writer.statusCode)

	assert.Equal(t, http.StatusNotFound, recorder.Code)

	content := "Test Content"
	_, err := writer.Write([]byte(content))
	require.NoError(t, err)

	assert.Equal(t, content, recorder.Body.String())
}

// setupTestMeter creates a test meter provider and reader for metrics inspection
func setupTestMeter(t *testing.T) (*sdkmetric.MeterProvider, *sdkmetric.ManualReader) {
	reader := sdkmetric.NewManualReader()
	provider := sdkmetric.NewMeterProvider(sdkmetric.WithReader(reader))

	originalProvider := otel.GetMeterProvider()
	otel.SetMeterProvider(provider)

	t.Cleanup(func() {
		otel.SetMeterProvider(originalProvider)
	})

	return provider, reader
}

func TestNewMetrics(t *testing.T) {
	provider, reader := setupTestMeter(t)
	defer provider.Shutdown(context.Background())

	metrics, err := NewMetrics()
	require.NoError(t, err)
	require.NotNil(t, metrics)

	assert.NotNil(t, metrics.RequestCounter)
	assert.NotNil(t, metrics.RequestDuration)
	assert.NotNil(t, metrics.ActiveRequestsGauge)
	assert.NotNil(t, metrics.ClusterProxyRequests)
	assert.NotNil(t, metrics.PluginLoadCount)
	assert.NotNil(t, metrics.ErrorCounter)

	ctx := context.Background()
	metrics.RequestCounter.Add(ctx, 1, metric.WithAttributes(attribute.String("test", "value")))
	metrics.ErrorCounter.Add(ctx, 2, metric.WithAttributes(attribute.String("error", "test_error")))

	var data metricdata.ResourceMetrics
	err = reader.Collect(ctx, &data)
	require.NoError(t, err)

	assert.NotEmpty(t, data.ScopeMetrics)

	found := false
	for _, scopeMetric := range data.ScopeMetrics {
		for _, m := range scopeMetric.Metrics {
			if m.Name == "http.server.request_count" {
				found = true
				break
			}
		}
	}
	assert.True(t, found, "Expected to find http.server.request_count metric")
}

func TestRequestCounterMiddleware(t *testing.T) {
	provider, reader := setupTestMeter(t)
	defer provider.Shutdown(context.Background())

	metrics, err := NewMetrics()
	require.NoError(t, err)

	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/error" {
			w.WriteHeader(http.StatusBadRequest)
			_, _ = w.Write([]byte("Error"))
			return
		}

		_, _ = w.Write([]byte("OK"))
	})

	handler := metrics.RequestCounterMiddleware(testHandler)

	server := httptest.NewServer(handler)
	defer server.Close()

	resp, err := http.Get(server.URL + "/test")
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	_ = resp.Body.Close()

	resp, err = http.Get(server.URL + "/error")
	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	_ = resp.Body.Close()

	var data metricdata.ResourceMetrics
	err = reader.Collect(context.Background(), &data)
	require.NoError(t, err)

	requestCountFound := false
	activeRequestsFound := false

	for _, scopeMetric := range data.ScopeMetrics {
		for _, m := range scopeMetric.Metrics {
			if m.Name == "http.server.request_count" {
				requestCountFound = true

				sum := sumDataPoints(t, m.Data)
				assert.GreaterOrEqual(t, sum, int64(2), "Expected at least 2 request count increments")
			}

			if m.Name == "http.server.active_requests" {
				activeRequestsFound = true

				sumActive := sumDataPoints(t, m.Data)
				assert.Equal(t, int64(0), sumActive, "Expected active requests to be 0 after all requests completed")
			}
		}
	}

	assert.True(t, requestCountFound, "Expected to find http.server.request_count metric")
	assert.True(t, activeRequestsFound, "Expected to find http.server.active_requests metric")
}

func TestRequestCounterMiddlewarePanic(t *testing.T) {
	provider, reader := setupTestMeter(t)
	defer provider.Shutdown(context.Background())

	metrics, err := NewMetrics()
	require.NoError(t, err)

	panicHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/panic" {
			panic("deliberate test panic")
		}
		_, _ = w.Write([]byte("OK"))
	})

	recoverMiddleware := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if rec := recover(); rec != nil {
					w.WriteHeader(http.StatusInternalServerError)
					_, _ = w.Write([]byte("Recovered from panic"))
				}
			}()
			next.ServeHTTP(w, r)
		})
	}

	handler := recoverMiddleware(metrics.RequestCounterMiddleware(panicHandler))

	server := httptest.NewServer(handler)
	defer server.Close()

	resp, err := http.Get(server.URL + "/normal")
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	_ = resp.Body.Close()

	resp, err = http.Get(server.URL + "/panic")
	require.NoError(t, err)
	assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
	_ = resp.Body.Close()

	var data metricdata.ResourceMetrics
	err = reader.Collect(context.Background(), &data)
	require.NoError(t, err)

	requestCountFound := false
	activeRequestsFound := false
	panicRequestFound := false

	for _, scopeMetric := range data.ScopeMetrics {
		for _, m := range scopeMetric.Metrics {
			if m.Name == "http.server.request_count" {
				requestCountFound = true

				sum := sumDataPoints(t, m.Data)
				assert.GreaterOrEqual(t, sum, int64(2), "Expected at least 2 request count increments")

				switch v := m.Data.(type) {
				case metricdata.Sum[int64]:
					for _, dp := range v.DataPoints {
						for _, attr := range dp.Attributes.ToSlice() {
							if attr.Key == attribute.Key("http.status_code") &&
								attr.Value.AsInt64() == http.StatusInternalServerError {
								panicRequestFound = true
							}
						}
					}
				}
			}

			if m.Name == "http.server.active_requests" {
				activeRequestsFound = true

				sumActive := sumDataPoints(t, m.Data)
				assert.Equal(t, int64(0), sumActive,
					"Expected active requests to be 0 after panic request completed")
			}
		}
	}

	assert.True(t, requestCountFound, "Expected to find http.server.request_count metric")
	assert.True(t, activeRequestsFound, "Expected to find http.server.active_requests metric")
	assert.True(t, panicRequestFound,
		"Expected to find a request with 500 status code from the panic")
}

func sumDataPoints(t *testing.T, data metricdata.Aggregation) int64 {
	switch v := data.(type) {
	case metricdata.Sum[int64]:
		sum := int64(0)
		for _, dp := range v.DataPoints {
			sum += dp.Value
		}
		return sum
	case metricdata.Sum[float64]:
		sum := float64(0)
		for _, dp := range v.DataPoints {
			sum += dp.Value
		}
		return int64(sum)
	case metricdata.Gauge[int64]:
		// For gauges, we just take the latest value
		if len(v.DataPoints) > 0 {
			return v.DataPoints[len(v.DataPoints)-1].Value
		}
	}
	return 0
}
