import json

log_path = "/Users/user/.gemini/antigravity-ide/brain/3bcd4aac-4a1b-4686-84cf-4b0e395937cc/.system_generated/logs/transcript.jsonl"
out_path = "/Applications/Arenga/vscode/breakdown_app/scratch/extracted_routing_history.txt"

with open(log_path, 'r') as f, open(out_path, 'w') as out:
    for line in f:
        step = json.loads(line)
        content = step.get("content", "")
        tool_calls = step.get("tool_calls", [])
        
        has_route = "routeParser" in content or "parseHashRoute" in content or "buildHashRoute" in content
        for tc in tool_calls:
            if "routeParser" in str(tc) or "parseHashRoute" in str(tc):
                has_route = True
                
        if has_route:
            out.write(f"\n=========================================\n")
            out.write(f"STEP: {step.get('step_index')} SOURCE: {step.get('source')} TYPE: {step.get('type')}\n")
            out.write(f"CONTENT:\n{content}\n")
            if tool_calls:
                out.write(f"TOOL_CALLS:\n{json.dumps(tool_calls, indent=2)}\n")
            out.write(f"=========================================\n")

print("Done! Extracted history written to:", out_path)
