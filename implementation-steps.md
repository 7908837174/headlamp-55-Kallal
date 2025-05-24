# Implementation Steps for Issue #3225

## Changes Made

1. Added a new function to check if a container has crashed:
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

2. Added a function to determine if previous logs can be shown:
```typescript
function canShowPreviousLogs() {
  return hasContainerRestarted() || hasContainerCrashed();
}
```

3. Updated the LightTooltip component to use the new function:
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

## Files Modified
- `frontend/src/components/pod/Details.tsx`

## How to Apply the Changes
1. Replace the existing `Details.tsx` file with the new version (`Details.tsx.new`)
2. Alternatively, manually add the new functions and update the LightTooltip component

## Testing
To test this implementation:
1. Create a Pod that crashes (e.g., using a container that exits with an error)
2. Open the Pod logs viewer
3. Verify that the "Show previous" option is enabled
4. Enable the option and check that the previous logs are displayed

## Expected Behavior
- The "Show previous" option should be enabled for containers that have crashed (have a terminated state)
- The "Show previous" option should still be enabled for containers that have been restarted
- The tooltip text should mention both crash and restart scenarios
- When enabled, the previous logs should be displayed correctly