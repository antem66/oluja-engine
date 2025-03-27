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
BINARY_EXTENSIONS="\.(jpg|jpeg|png|gif|ico|svg|webp|pdf|doc|docx|xls|xlsx|zip|tar|gz|rar|mp3|mp4|avi|mov|ttf|woff|woff2|eot)$"

# Function to check if a file matches gitignore patterns
should_ignore() {
    local file="$1"
    local gitignore="$2"
    
    # Always ignore binary files
    if echo "$file" | grep -qE "$BINARY_EXTENSIONS"; then
        return 0
    fi

    # Read gitignore patterns and check if file matches
    while IFS= read -r pattern; do
        # Skip empty lines and comments
        [[ -z "$pattern" || "$pattern" =~ ^# ]] && continue
        
        # Remove leading and trailing slashes
        pattern="${pattern#/}"
        pattern="${pattern%/}"
        
        # Convert gitignore pattern to regex
        # Replace * with .*, escape dots, etc.
        pattern=$(echo "$pattern" | sed 's/\./\\./g; s/\*/[^\/]*/g; s/\?/./g')
        
        if echo "$file" | grep -q "$pattern"; then
            return 0
        fi
    done < "$gitignore"
    
    return 1
}

# Process each folder path provided as an argument
for FOLDER_PATH in "$@"; do
    # Check if the folder exists
    if [ ! -d "$FOLDER_PATH" ]; then
        echo "Error: Folder '$FOLDER_PATH' not found. Skipping." | tee -a "$OUTPUT_FILE"
        continue
    fi

    # Find the nearest .gitignore file
    GITIGNORE="$FOLDER_PATH/.gitignore"
    if [ ! -f "$GITIGNORE" ]; then
        GITIGNORE=".gitignore"
    fi

    if [ ! -f "$GITIGNORE" ]; then
        echo "Warning: No .gitignore file found. Only filtering binary files." | tee -a "$OUTPUT_FILE"
    fi

    # Find all files in the folder and its subfolders
    find "$FOLDER_PATH" -type f | while read -r file; do
        # Get relative path
        relative_path=${file#"$FOLDER_PATH/"}
        
        # Skip if file should be ignored
        if [ -f "$GITIGNORE" ] && should_ignore "$relative_path" "$GITIGNORE"; then
            continue
        fi
        
        # Skip binary files and only process text files
        if file "$file" | grep -q "text"; then
            # Skip empty files
            if [ -s "$file" ]; then
                echo "<file_content path=\"$file\">" | tee -a "$OUTPUT_FILE"
                cat "$file" | tee -a "$OUTPUT_FILE"
                echo "</file_content>" | tee -a "$OUTPUT_FILE"
                echo "" | tee -a "$OUTPUT_FILE"
            fi
        fi
    done
done

echo "Output saved to $OUTPUT_FILE"

# For macOS: Copy to clipboard
if [[ "$OSTYPE" == "darwin"* ]]; then
    cat "$OUTPUT_FILE" | pbcopy
    echo "Output copied to clipboard"
fi