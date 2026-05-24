import re

# Load parsed master data from parsed_standards.js
with open('/Users/user/.gemini/antigravity/brain/6385d98f-04a1-4bb5-b19d-7dad66ead114/scratch/parsed_standards.js', 'r') as f:
    js_content = f.read()

# Extract only the inner part of parsedModulMasterData = { ... }
# The file content matches: `export const parsedModulMasterData = { ... };`
# We want the content inside `{` and `};`
match_js = re.search(r'export const parsedModulMasterData = \{(.*?)\};', js_content, re.DOTALL)
if match_js:
    inner_content = match_js.group(1).strip()
    new_master_data_str = "  modulMasterData: {\n    " + inner_content + "\n  },"
    
    # Read original initialState.js
    with open('/Applications/Arenga/vscode/breakdown_app/src/initialState.js', 'r') as f:
        content = f.read()
        
    # Locate the modulMasterData block:
    # Start: `modulMasterData: {`
    # End: `},` right before `moduls: [` (or in our case, just before `moduls: [`)
    pattern = r'modulMasterData:\s*\{.*?\n\s*\},\s*\n\s*moduls:'
    match = re.search(pattern, content, re.DOTALL)
    if match:
        replacement = new_master_data_str + "\n\n    moduls:"
        updated_content = re.sub(pattern, replacement, content, flags=re.DOTALL)
        
        with open('/Applications/Arenga/vscode/breakdown_app/src/initialState.js', 'w') as f:
            f.write(updated_content)
        print("Successfully updated initialState.js modulMasterData with correct excel values!")
    else:
        print("ERROR: Could not locate modulMasterData block in initialState.js!")
else:
    print("ERROR: Could not parse parsed_standards.js!")
