#!/bin/bash

# Usage: ./list_files.sh <folder_path1> <folder_path2> ...
# Example: ./list_files.sh 'apps/web/app/(web)' apps/web/app

# Check if at least one folder path is provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <folder_path1> <folder_path2> ..."
    exit 1
fi

# Create snapshots directory if it doesn't exist
SNAPSHOTS_DIR="snapshots"
mkdir -p "$SNAPSHOTS_DIR"

# Generate a timestamp for the output file
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
OUTPUT_FILE="$SNAPSHOTS_DIR/snapshot_$TIMESTAMP.txt"

# Common binary and generated file extensions to skip
BINARY_EXTENSIONS="\.(jpg|jpeg|png|gif|ico|svg|webp|pdf|doc|docx|xls|xlsx|zip|tar|gz|rar|mp3|mp4|avi|mov|ttf|woff|woff2|eot|sh)$|^package-lock\.json$"

# Enable debug output
DEBUG=true

debug() {
    if [ "$DEBUG" = true ]; then
        echo "[DEBUG] $1" >&2
    fi
}

# Function to check if a file matches gitignore patterns
should_ignore() {
    local file="$1"
    local gitignore="$2"
    
    # Always ignore binary files
    if echo "$file" | grep -qE "$BINARY_EXTENSIONS"; then
        debug "Ignoring binary file: $file"
        return 0
    fi

    # Always ignore node_modules
    if echo "$file" | grep -q "node_modules/"; then
        debug "Ignoring node_modules file: $file"
        return 0
    fi

    # Read gitignore patterns and check if file matches
    while IFS= read -r pattern; do
        # Skip empty lines and comments
        [[ -z "$pattern" || "$pattern" =~ ^# ]] && continue
        
        # Remove leading and trailing slashes
        pattern="${pattern#/}"
        pattern="${pattern%/}"
        
        # Handle directory patterns (ending with /)
        if [[ "$pattern" == */ ]]; then
            pattern="${pattern%/}"
            if echo "$file" | grep -q "^$pattern/\|/$pattern/"; then
                debug "File $file matches directory pattern: $pattern/"
                return 0
            fi
            continue
        fi
        
        # Handle negation patterns
        if [[ "$pattern" == !* ]]; then
            pattern="${pattern#!}"
            if ! echo "$file" | grep -q "$pattern"; then
                continue
            fi
            return 1
        fi
        
        # Convert gitignore pattern to regex
        # Handle special cases:
        # - ** matches zero or more directories
        # - * matches anything except /
        # - ? matches any single character except /
        pattern=$(echo "$pattern" | sed -E '
            s#\*\*/#.*/|/#g;
            s#\*\*#.*#g;
            s#\*#[^/]*#g;
            s#\?#[^/]#g;
            s#\.#\\.#g
        ')
        
        if echo "$file" | grep -qE "^($pattern)|/($pattern)(/|$)"; then
            debug "File $file matches gitignore pattern: $pattern"
            return 0
        fi
    done < "$gitignore"
    
    return 1
}

# Process each folder path provided as an argument
for FOLDER_PATH in "$@"; do
    # Get absolute path of the target directory
    if [ -d "$FOLDER_PATH" ]; then
        FOLDER_PATH=$(cd "$FOLDER_PATH" && pwd)
    else
        echo "Error: Directory '$FOLDER_PATH' not found. Skipping." | tee -a "$OUTPUT_FILE"
        continue
    fi
    
    debug "Processing directory: $FOLDER_PATH"

    # Find the nearest .gitignore file
    GITIGNORE="$FOLDER_PATH/.gitignore"
    if [ ! -f "$GITIGNORE" ]; then
        GITIGNORE=".gitignore"
    fi

    if [ ! -f "$GITIGNORE" ]; then
        echo "Warning: No .gitignore file found. Only filtering binary files." | tee -a "$OUTPUT_FILE"
    else
        debug "Using gitignore file: $GITIGNORE"
    fi

    # Find all files in the folder and its subfolders
    while IFS= read -r -d '' file; do
        # Get relative path for gitignore matching
        relative_path=${file#"$FOLDER_PATH/"}
        
        debug "Processing file: $file (relative: $relative_path)"
        
        # Skip if file should be ignored
        if [ -f "$GITIGNORE" ] && should_ignore "$relative_path" "$GITIGNORE"; then
            continue
        fi
        
        # Skip binary files and only process text files
        if file "$file" | grep -qE "text|JSON data|ASCII text"; then
            # Skip empty files
            if [ -s "$file" ]; then
                # Get relative path for output
                relative_path=${file#"$FOLDER_PATH/"}
                # Remove leading slash if present (for files in root directory)
                relative_path=${relative_path#/}
                echo "Processing: $relative_path" >&2
                echo "<file_content path=\"$relative_path\">" | tee -a "$OUTPUT_FILE"
                cat "$file" | tee -a "$OUTPUT_FILE"
                echo "</file_content>" | tee -a "$OUTPUT_FILE"
                echo "" | tee -a "$OUTPUT_FILE"
            fi
        else
            debug "Skipping non-text file: $file"
        fi
    done < <(find "$FOLDER_PATH" -type f \
        -not -path "*/node_modules/*" \
        -not -path "*/.git/*" \
        -not -path "*/.vscode/*" \
        -not -path "*/.idea/*" \
        -not -path "*/.DS_Store" \
        -not -name ".gitignore" \
        -not -name ".eslintrc*" \
        -not -name ".prettierrc*" \
        -not -name ".editorconfig" \
        -not -name "*.config.*" \
        -print0)
done

echo "Output saved to $OUTPUT_FILE"

# For macOS: Copy to clipboard
if [[ "$OSTYPE" == "darwin"* ]]; then
    cat "$OUTPUT_FILE" | pbcopy
    echo "Output copied to clipboard"
fi