class ReadBuffer {
    constructor(buffer) {
        this.buffer = buffer;
        this.offset = 0;
    }

    readBool() {
        return this.readByte() !== 0;
    }

    readUByte() {
        return this.readByte();
    }

    readUShort() {
        return this.readUInt16();
    }

    readUInt() {
        return this.readUInt32();
    }

    readFloat() {
        return this.readFloat32();
    }

    readDouble() {
        return this.readFloat64();
    }

    readULong() {
        return this.readBigUInt64();
    }

    readIntDouble() {
        this.readUByte();
        const integer = this.readUInt();
        this.readUByte();
        const double = this.readDouble();
        return [integer, double];
    }

    readTimingPoint() {
        const bpm = this.readDouble();
        const offset = this.readDouble();
        const inherited = this.readBool();
        return [bpm, offset, inherited];
    }

    readString() {
        let strlen = 0;
        const strflag = this.readUByte();
        if (strflag === 0x0b) {
            let shift = 0;
            let byte;
            // Unsigned LEB128
            do {
                byte = this.readUByte();
                strlen |= ((byte & 0x7F) << shift);
                shift += 7;
            } while (byte & (1 << 7));
        }
        const stringBuffer = this.readBuffer(strlen);
        return new TextDecoder("utf-8").decode(stringBuffer);
    }

    readByte() {
        const byte = this.buffer[this.offset];
        this.offset += 1;
        return byte;
    }

    readBuffer(length) {
        const data = this.buffer.slice(this.offset, this.offset + length);
        this.offset += length;
        return data;
    }

    readUInt16() {
        const value = this.buffer[this.offset] | (this.buffer[this.offset + 1] << 8);
        this.offset += 2;
        return value;
    }

    readUInt32() {
        const value = new DataView(this.buffer.buffer, this.offset, 4).getUint32(0, true);
        this.offset += 4;
        return value;
    }

    readFloat32() {
        const buffer = this.buffer.slice(this.offset, this.offset + 4);
        const value = new DataView(buffer.buffer).getFloat32(0, true);
        this.offset += 4;
        return value;
    }

    readFloat64() {
        const buffer = this.buffer.slice(this.offset, this.offset + 8);
        const value = new DataView(buffer.buffer).getFloat64(0, true);
        this.offset += 8;
        return value;
    }

    readBigUInt64() {
        const low = this.readUInt32();
        const high = this.readUInt32();
        return BigInt(high) << 32n | BigInt(low);
    }
}

class WriteBuffer {
    constructor(initialSize = 256) {
        this.offset = 0;
        this.data = new Uint8Array(initialSize);
    }

    writeBool(data) {
        this.writeByte(data ? 1 : 0);
    }

    writeUByte(data) {
        this.writeByte(data);
    }

    writeUShort(data) {
        this.writeUInt16(data);
    }

    writeUInt(data) {
        this.writeUInt32(data);
    }

    writeFloat(data) {
        const buffer = new ArrayBuffer(4);
        new Float32Array(buffer)[0] = data;
        this.appendBuffer(new Uint8Array(buffer));
    }

    writeDouble(data) {
        const buffer = new ArrayBuffer(8);
        new Float64Array(buffer)[0] = data;
        this.appendBuffer(new Uint8Array(buffer));
    }

    writeULong(data) {
        this.writeUInt32(Number(data & 0xFFFFFFFFn));
        this.writeUInt32(Number(data >> 32n));
    }

    writeString(data) {
        if (data.length > 0) {
            this.writeUByte(0x0b);
            let value = data.length;
            let strlen = [];
            while (value !== 0) {
                let byte = (value & 0x7F);
                value >>= 7;
                if (value !== 0) {
                    byte |= 0x80;
                }
                strlen.push(byte);
            }
            this.appendBuffer(new Uint8Array(strlen));
            this.appendBuffer(new TextEncoder().encode(data));
        } else {
            this.writeUByte(0x0);
        }
    }

    writeByte(data) {
        this.ensureCapacity(1);
        this.data[this.offset++] = data;
    }

    writeUInt16(data) {
        this.ensureCapacity(2);
        this.data[this.offset++] = data & 0xFF;
        this.data[this.offset++] = (data >> 8) & 0xFF;
    }

    writeUInt32(data) {
        this.ensureCapacity(4);
        this.data[this.offset++] = data & 0xFF;
        this.data[this.offset++] = (data >> 8) & 0xFF;
        this.data[this.offset++] = (data >> 16) & 0xFF;
        this.data[this.offset++] = (data >> 24) & 0xFF;
    }

    ensureCapacity(size) {
        if (this.offset + size > this.data.length) {
            const newData = new Uint8Array(this.offset + size + 2048);
            newData.set(this.data);
            this.data = newData;
        }
    }

    appendBuffer(buffer) {
        this.ensureCapacity(buffer.length);
        this.data.set(buffer, this.offset);
        this.offset += buffer.length;
    }

    clearBuffer() {
        this.data = new Uint8Array(initialSize);
        this.offset = 0;
    }

    getTruncatedData() {
        return this.data.slice(0, this.offset); // Only include used bytes
    }
}
