# Solution for Issue #3225: View crashed Pod logs (previous logs)

## Problem
Currently, the "Show previous" option in the Pod logs viewer is only enabled for containers that have been restarted. However, users need to be able to view logs from previous container instances when a Pod has crashed, even if it hasn't restarted.

## Implementation
I've created a new implementation in `PodLogViewer.tsx` that addresses this issue by:

1. Adding a function to check if a container has crashed (has a terminated state):
```typescript
function hasContainerCrashed() {
  const cont = item?.status?.containerStatuses?.find(
    (c: KubeContainerStatus) => c.name === container
  );
  if (!cont) {
    return false;
  }

  return !!cont.lastState?.terminated;
}
```

2. Creating a function that combines both restart and crash checks:
```typescript
function canShowPreviousLogs() {
  return hasContainerRestarted() || hasContainerCrashed();
}
```

3. Updating the UI to enable the "Show previous" option for both cases:
```typescript
<LightTooltip
  title={
    canShowPreviousLogs()
      ? t('translation|Show logs for previous instances of this container.')
      : t(
          'translation|You can only select this option for containers that have crashed or been restarted.'
        )
  }
>
  <PaddedFormControlLabel
    label={t('translation|Show previous')}
    disabled={!canShowPreviousLogs()}
    control={
      <Switch
        checked={showPrevious}
        onChange={handlePreviousChange}
        name="checkPrevious"
        color="primary"
        size="small"
      />
    }
  />
</LightTooltip>
```

## Testing
The implementation has been tested with:
- Containers that have restarted (restartCount > 0)
- Containers that have crashed (lastState.terminated exists)
- Containers that have neither crashed nor restarted

The "Show previous" option is correctly enabled for both crashed and restarted containers, and the tooltip text has been updated to reflect this change.

## API Usage
The implementation uses the Kubernetes API endpoint `/api/v1/namespaces/{namespace}/pods/{pod}/log?previous=true` when the "Show previous" option is enabled, which is already handled by the existing code that passes the `showPrevious` parameter to the `getLogs` function.

This solution addresses issue #3225 by allowing users to view logs from previous container instances when troubleshooting crashed Pods.