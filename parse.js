// Parse .osu files and extract BeatmapID + Hash
async function parseBeatmaps(files) {
    const multiFilesPresent = files.length > 1;
    const beatmapHashes = {};

    for (let file of files) {
        const content = await file.text();

        // Extract BeatmapID from the content
        const beatmapId = parseInt(content.match(/BeatmapID:\s*(\d+)/)?.[1], 10);
        if (isNaN(beatmapId)) {
            output.textContent += `'${file.name}' is an invalid Beatmap! Skipping.\n`;
            continue;
        }

        // Check if beatmapId is 0, Ignoring if only one file present as that ensures no ambiguity
        if (multiFilesPresent && beatmapId === 0) {
            output.textContent += `BeatmapID of '${file.name}' is 0. Skipping due to potential ambiguity.\n`;
            continue;
        }

        const bytes = new Uint8Array(await file.arrayBuffer());
        const wordArray = CryptoJS.lib.WordArray.create(bytes);
        beatmapHashes[beatmapId] = CryptoJS.MD5(wordArray).toString();
    }
    
    return beatmapHashes;
}

async function unpackScores(file) {
    const buffer = await file.arrayBuffer();
    const readBuffer = new ReadBuffer(new Uint8Array(buffer));
    const version = readBuffer.readUInt();
    const numMaps = readBuffer.readUInt();
    const beatmapScoresMap = {};  // beatmaps[md5] = [scores]

    for (let i = 0; i < numMaps; i++) {
        const scores = [];
        const md5Hash = readBuffer.readString();
        const numScores = readBuffer.readUInt();

        for (let j = 0; j < numScores; j++) {
            const score = new Score();
            score.mode = readBuffer.readUByte();
            score.version = readBuffer.readUInt();
            score.beatmapMd5 = readBuffer.readString();
            score.playerName = readBuffer.readString();
            score.replayMd5 = readBuffer.readString();
            score.num300s = readBuffer.readUShort();
            score.num100s = readBuffer.readUShort();
            score.num50s = readBuffer.readUShort();
            score.numGekis = readBuffer.readUShort();
            score.numKatus = readBuffer.readUShort();
            score.numMisses = readBuffer.readUShort();
            score.replayScore = readBuffer.readUInt();
            score.maxCombo = readBuffer.readUShort();
            score.perfectCombo = readBuffer.readBool();
            score.mods = readBuffer.readUInt();
            score.emptyString = readBuffer.readString();
            score.timestamp = readBuffer.readULong();
            score.negativeOne = readBuffer.readUInt();
            score.onlineScoreId = readBuffer.readULong();

            scores.push(score);
        }
        beatmapScoresMap[md5Hash] = scores;
    }

    return { beatmaps: beatmapScoresMap, version };
}

async function packScores(beatmapScores, version) {
    const totalBeatmaps = Object.keys(beatmapScores).length;
    const writeBuffer = new WriteBuffer(totalBeatmaps * 256);
    writeBuffer.writeUInt(version);
    writeBuffer.writeUInt(totalBeatmaps);

    let i = 0;
    const secondLastNewlineIndex = output.textContent.lastIndexOf("\n", output.textContent.lastIndexOf("\n") - 1);
    
    for (const md5Hash in beatmapScores) {
        i++;
        if ((i % 100 === 0 || i === totalBeatmaps)) {
            output.textContent = output.textContent.slice(0, secondLastNewlineIndex + 1) + `Adding maps to new file... (${i}/${totalBeatmaps})\n`;
            await new Promise(r => setTimeout(r, 0)); // Yield to process UI updates
        }
        writeBuffer.writeString(md5Hash);
        writeBuffer.writeUInt(beatmapScores[md5Hash].length);
        
        for (const score of beatmapScores[md5Hash]) {
            writeBuffer.writeUByte(score.mode);
            writeBuffer.writeUInt(score.version);
            writeBuffer.writeString(score.beatmapMd5);
            writeBuffer.writeString(score.playerName);
            writeBuffer.writeString(score.replayMd5);
            writeBuffer.writeUShort(score.num300s);
            writeBuffer.writeUShort(score.num100s);
            writeBuffer.writeUShort(score.num50s);
            writeBuffer.writeUShort(score.numGekis);
            writeBuffer.writeUShort(score.numKatus);
            writeBuffer.writeUShort(score.numMisses);
            writeBuffer.writeUInt(score.replayScore);
            writeBuffer.writeUShort(score.maxCombo);
            writeBuffer.writeBool(score.perfectCombo);
            writeBuffer.writeUInt(score.mods);
            writeBuffer.writeString(score.emptyString);
            writeBuffer.writeULong(score.timestamp);
            writeBuffer.writeUInt(score.negativeOne);
            writeBuffer.writeULong(score.onlineScoreId);
        }
    }

    const fileBlob = new Blob([writeBuffer.getTruncatedData()], { type: 'application/octet-stream' });

    return fileBlob;
}
