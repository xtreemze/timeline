# Node Connection/Disconnection Delay Feature

## Overview

This feature extends the delay of node connections and disconnections in the temporal graph based on pointer/touch events. When a user drags the timeline surface, the graph edges maintain their connection state for a minimum of 2 seconds after the pointer is released, preventing jarring visual updates while the user is interacting with the timeline.

## Implementation Details

### File Modified
- `site/temporal-graph-view.ts`

### Key Changes

1. **New Instance Variables**
   - `pointerHeldUntil: number` - Timestamp until which pointer is considered "held"
   - `cachedEdgesWhileHeld: Edge[] | null` - Cached edge states during pointer interaction
   - `edgeUpdateDelayTimer: number` - Timer ID for delayed edge updates after pointer release

2. **New Method: `setupPointerEventTracking()`**
   - Listens to pointer events on the timeline surface
   - On pointerdown: Sets `pointerHeldUntil` to current time + 2000ms
   - On pointerup/pointercancel: Schedules a delayed re-render after the hold period expires
   - Clears any pending timers to avoid conflicts

3. **New Method: `isPointerHeld()`**
   - Returns true if current time < pointerHeldUntil
   - Used to check if edges should be cached or updated

4. **Modified Method: `render()`**
   - When pointer is held and edges are not cached: caches current edge states
   - When pointer is held: uses cached edges instead of new temporal states
   - When pointer is released after 2 seconds: updates edges with new temporal states

## Behavior

### During Pointer Down
1. User presses on the timeline surface
2. `pointerHeldUntil` is set to now + 2000ms
3. User drags timeline (viewport changes)
4. Graph viewport updates but edge connection states stay locked
5. If render() is called, cached edges are used instead of computing new states

### After Pointer Release
1. User releases pointer
2. If held duration < 2 seconds: timer is set for remaining duration
3. Graph continues using cached edge states
4. After 2 seconds total hold time: 
   - Cached edges are cleared
   - render() is called to update edges with current viewport's temporal states
   - Graph smoothly updates connections based on new time window

## Benefits

- **Smooth user experience**: No flickering of connections during drag operations
- **Visual stability**: Minimum 2-second guarantee that connections persist, giving users time to interpret the graph
- **Touch-friendly**: Works with both mouse and touch inputs
- **Performance**: Reduces unnecessary graph recalculations during rapid viewport changes

## Testing

Test the feature by:
1. Open the Timeline application
2. Drag the timeline surface to change the visible time window
3. Observe that graph connections maintain their state while dragging
4. Release the pointer
5. Wait up to 2 seconds and observe smooth update of connections

## Technical Constraints

- Minimum hold duration is hardcoded to 2000ms (2 seconds)
- Feature requires finding `.timeline-surface` element using DOM traversal
- Works only when graph data hasn't changed topology (only temporal states change)
- Gracefully degrades if pointer event tracking fails to initialize

## Future Enhancements

- Make hold duration configurable via constructor options
- Add visual indicator showing remaining hold time
- Implement per-edge caching instead of all-or-nothing approach
- Add configuration to disable this feature for accessibility preferences
