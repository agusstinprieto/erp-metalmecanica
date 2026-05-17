
export function encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

export function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

export async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

// Naive downsampling to 16kHz with proper clamping
export function downsampleTo16k(buffer: Float32Array, inputSampleRate: number): Int16Array {
    const targetRate = 16000;
    const ratio = inputSampleRate / targetRate;
    
    // Calculate new length to avoid index out of bounds
    const newLength = Math.floor(buffer.length / ratio);
    const result = new Int16Array(newLength);

    for (let i = 0; i < newLength; i++) {
        const offset = Math.floor(i * ratio);
        // Clamp to avoid clipping artifacts/overflow (-32768 to 32767)
        let sample = buffer[offset];
        if (sample > 1) sample = 1;
        if (sample < -1) sample = -1;
        result[i] = sample * 32767.5; // Use 32767.5 to cover full range
    }
    return result;
}

export function createPCM16kBlob(data: Float32Array, inputSampleRate: number): { data: string; mimeType: string } {
    const int16 = downsampleTo16k(data, inputSampleRate);
    return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000',
    };
}
