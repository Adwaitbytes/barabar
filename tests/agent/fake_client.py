"""A scripted stand-in for the Anthropic client: each call pops the next scripted
turn. Lets us test the loop, evidence hashing and NumberGuard with zero tokens."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class TextBlock:
    text: str
    type: str = "text"


@dataclass
class ToolUseBlock:
    id: str
    name: str
    input: dict[str, Any]
    type: str = "tool_use"


@dataclass
class Response:
    content: list[Any]
    stop_reason: str = "end_turn"


@dataclass
class _Messages:
    script: list[list[Any]]
    calls: list[dict[str, Any]] = field(default_factory=list)

    def create(self, **kwargs: Any) -> Response:
        self.calls.append(kwargs)
        if not self.script:
            return Response(content=[TextBlock("(script exhausted)")])
        turn = self.script.pop(0)
        return Response(
            content=turn,
            stop_reason="tool_use"
            if any(getattr(b, "type", "") == "tool_use" for b in turn)
            else "end_turn",
        )


@dataclass
class _Beta:
    messages: _Messages


class FakeClient:
    def __init__(self, script: list[list[Any]]) -> None:
        self.beta = _Beta(_Messages(script))

    @property
    def calls(self) -> list[dict[str, Any]]:
        return self.beta.messages.calls
