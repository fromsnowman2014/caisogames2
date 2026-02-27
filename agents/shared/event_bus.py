"""
Event Bus for inter-agent communication.
Enables agents to publish/subscribe to events asynchronously.
"""

from typing import Dict, List, Callable, Any, Optional
from enum import Enum
from dataclasses import dataclass
from datetime import datetime


class EventType(Enum):
    """All possible events in the system."""

    # Design Team Events
    DESIGN_STARTED = "design.started"
    DESIGN_COMPLETED = "design.completed"
    DESIGN_FAILED = "design.failed"

    # Art Team Events
    ASSET_GENERATION_STARTED = "asset.generation_started"
    ASSET_GENERATED = "asset.generated"
    ASSET_APPROVED = "asset.approved"
    ASSET_REJECTED = "asset.rejected"

    # Engineering Team Events
    CODE_GENERATION_STARTED = "code.generation_started"
    CODE_GENERATED = "code.generated"
    CODE_REVIEWED = "code.reviewed"
    CODE_OPTIMIZED = "code.optimized"

    # QA Team Events
    QA_STARTED = "qa.started"
    BUG_FOUND = "qa.bug_found"
    TESTS_PASSED = "qa.tests_passed"
    TESTS_FAILED = "qa.tests_failed"

    # Integration Events
    BUILD_STARTED = "build.started"
    BUILD_COMPLETE = "build.complete"
    BUILD_FAILED = "build.failed"

    # Deployment Events
    DEPLOY_STARTED = "deploy.started"
    DEPLOY_COMPLETE = "deploy.complete"
    DEPLOY_FAILED = "deploy.failed"


@dataclass
class Event:
    """Event object passed through the bus."""

    type: EventType
    source_agent: str
    payload: Dict[str, Any]
    timestamp: datetime

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()


class EventBus:
    """
    Simple event bus for agent communication.
    Singleton pattern for global access.
    """

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._subscribers: Dict[EventType, List[Callable]] = {}
            cls._instance._event_history: List[Event] = []
        return cls._instance

    def subscribe(self, event_type: EventType, handler: Callable[[Event], None]):
        """Subscribe to an event type."""
        if event_type not in self._subscribers:
            self._subscribers[event_type] = []

        self._subscribers[event_type].append(handler)

    def unsubscribe(self, event_type: EventType, handler: Callable[[Event], None]):
        """Unsubscribe from an event type."""
        if event_type in self._subscribers:
            self._subscribers[event_type].remove(handler)

    def emit(self, event: Event):
        """Emit an event to all subscribers."""
        # Store in history
        self._event_history.append(event)

        # Notify subscribers
        if event.type in self._subscribers:
            for handler in self._subscribers[event.type]:
                try:
                    handler(event)
                except Exception as e:
                    print(f"❌ Event handler error: {e}")

    def get_history(self, event_type: Optional[EventType] = None) -> List[Event]:
        """Get event history, optionally filtered by type."""
        if event_type:
            return [e for e in self._event_history if e.type == event_type]
        return self._event_history.copy()

    def clear_history(self):
        """Clear event history."""
        self._event_history.clear()


# Global instance
event_bus = EventBus()


# Helper functions
def emit_event(event_type: EventType, source: str, payload: Dict[str, Any]):
    """Convenience function to emit an event."""
    event = Event(
        type=event_type,
        source_agent=source,
        payload=payload,
        timestamp=datetime.now(),
    )
    event_bus.emit(event)


def on_event(event_type: EventType):
    """Decorator for event handlers."""

    def decorator(func: Callable[[Event], None]):
        event_bus.subscribe(event_type, func)
        return func

    return decorator


if __name__ == "__main__":
    # Test
    @on_event(EventType.DESIGN_COMPLETED)
    def handle_design_complete(event: Event):
        print(f"✅ Design completed by {event.source_agent}")
        print(f"   Payload: {event.payload}")

    emit_event(
        EventType.DESIGN_COMPLETED,
        "ConceptDesignerAgent",
        {"concept": "platformer", "quality_score": 95},
    )

    print("\nEvent History:")
    for event in event_bus.get_history():
        print(f"  - {event.type.value} @ {event.timestamp}")
