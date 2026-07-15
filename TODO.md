# TODO

## Upgrade copilot to Claude API

- **Status:** Pending
- **Docs:** [docs/copilot-upgrade.md](./docs/copilot-upgrade.md)
- **Summary:** Replace the rule-based answer engine (`components/copilot/rules.ts`) with a real Claude-API copilot. Create a serverless route (`app/api/copilot/route.ts`) that calls the Anthropic Messages API with live search/part data as context and streams responses. Fall back to the rule engine when `ANTHROPIC_API_KEY` is not set.

## Implement TrustedParts.com API as a Provider

- **Status:** Pending
- **Docs:** None
- **Summary:** Self explanatory




## Implement componenetsearchengine.com

- https://componentsearchengine.com/2D/0/partid.png for 2d image
- https://componentsearchengine.com/symbol.php?partID=partid for symbol


https://componentsearchengine.com/partApi/3dModel?samacPartId=13657988&type=normal
https://componentsearchengine.com/partApi/3dModel?samacPartId=13657988&type=board
