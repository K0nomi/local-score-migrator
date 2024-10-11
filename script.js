"use strict";

const oldFolderInput = document.getElementById('oldFolder');
const newFolderInput = document.getElementById('newFolder');
const generateHashTableButton = document.getElementById('generateHashTable');
const hashTableTextArea = document.getElementById('hashTable');
const scoresDbInput = document.getElementById('scoresDb');
const applyHashTableButton = document.getElementById('applyHashTable');
const output = document.getElementById('output');

let oldFiles = {};
let newFiles = {};

// Enable button if all fields are populated
function updateButtonState() {
    generateHashTableButton.disabled = !(oldFolderInput.files.length > 0 && newFolderInput.files.length > 0);
    applyHashTableButton.disabled = !(hashTableTextArea.value && scoresDbInput.files.length > 0);
}

oldFolderInput.addEventListener('change', () => {
    oldFiles = Array.from(oldFolderInput.files);
    updateButtonState();
});

newFolderInput.addEventListener('change', () => {
    newFiles = Array.from(newFolderInput.files);
    updateButtonState();
});

scoresDbInput.addEventListener('change', updateButtonState);
hashTableTextArea.addEventListener('input', updateButtonState);

// Generate Hash Table button functionality
generateHashTableButton.addEventListener('click', async () => {
    output.textContent = "Generating hash table...\n";
    
    const oldHashes = await parseBeatmaps(oldFiles);
    const newHashes = await parseBeatmaps(newFiles);

    // Create hash substitution table
    let hashSubstitutionTable = {};

    const oldKeys = Object.keys(oldHashes);
    const newKeys = Object.keys(newHashes);

    if (oldKeys.length === 1 && newKeys.length === 1) {
        // If only one file, substitute the hashes without checking the beatmap ID
        hashSubstitutionTable[oldHashes[oldKeys[0]]] = newHashes[newKeys[0]];
    } else {
        // If multiple files, check if beatmap IDs match
        if (oldKeys.length !== newKeys.length || !oldKeys.every(key => newKeys.includes(key))) {
            output.textContent += "Beatmap IDs don't match up. Some may not transfer as expected!\n";
        }

        oldKeys.forEach(beatmapId => {
            if (newHashes[beatmapId]) {
                // Substituting the hash based on matching beatmap IDs
                hashSubstitutionTable[oldHashes[beatmapId]] = newHashes[beatmapId];
            }
        });
    }

    // Display hash table in textarea
    hashTableTextArea.value = JSON.stringify(hashSubstitutionTable, null, 2);

    output.textContent += "Hash table generated.\n";
    updateButtonState();
});


// Apply Hash Table button functionality
applyHashTableButton.addEventListener('click', async () => {
    output.textContent = "Applying hash table...\n";

    let hashSubstitutionTable;
    try {
        hashSubstitutionTable = JSON.parse(hashTableTextArea.value);
    } catch (error) {
        output.textContent += `Invalid JSON: ${error.message}\n`;
        return;
    }

    const { beatmaps, version } = await unpackScores(scoresDbInput.files[0]);

    for (const beatmap of Object.keys(beatmaps)) {
        if (hashSubstitutionTable.hasOwnProperty(beatmap)) {
            const newHash = hashSubstitutionTable[beatmap];
            const scores = beatmaps[beatmap];
            delete beatmaps[beatmap];

            // Update beatmap hash stored in each score
            for (const score of scores) {
                score.md5 = newHash;
            }

            // Add scores if some are present, create new entry if not
            if (beatmaps.hasOwnProperty(newHash)) {
                beatmaps[newHash].push(...scores);
            } else {
                beatmaps[newHash] = scores;
            }
        }
    }

    output.textContent += "Adding maps to new file...\n";
    await new Promise(r => setTimeout(r, 0)); // Yield to process UI updates

    const outputFile = await packScores(beatmaps, version);

    output.textContent += "Downloading...\n";

    const url = URL.createObjectURL(outputFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = "scores.db";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});