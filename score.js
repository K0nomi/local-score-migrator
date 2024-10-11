class Score {
    constructor() {
        this.mode = -1;
        this.version = 0;
        this.replayMd5 = "";
        this.beatmapMd5 = "";
        this.playerName = "";
        this.num300s = 0;
        this.num100s = 0;
        this.num50s = 0;
        this.numGekis = 0;
        this.numKatus = 0;
        this.numMisses = 0;
        this.replayScore = 0;
        this.maxCombo = 0;
        this.perfectCombo = false;
        this.mods = 0;
        this.emptyString = "";
        this.timestamp = 0n;
        this.negativeOne = 0xffffffff;
        this.onlineScoreId = 0n;
    }

    equals(other) {
        if (this.replayMd5 !== "" && other.replayMd5 !== "") {
            return this.replayMd5 === other.replayMd5;
        } else {
            return (
                this.timestamp === other.timestamp &&
                this.playerName === other.playerName &&
                this.beatmapMd5 === other.beatmapMd5
            );
        }
    }
}

class Beatmap {
    constructor() {
        this.md5Hash = "";
        this.numScores = 0;
        this.scores = [];
    }

    equals(other) {
        return this.md5Hash === other.md5Hash;
    }
}
