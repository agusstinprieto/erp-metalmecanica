/**
 * MCVILL ERP - HIGH PERFORMANCE AUDIO PROCESSOR
 * Runs in a separate thread to ensure zero audio cutouts.
 */
class AudioProcessor extends AudioWorkletProcessor {
    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (input && input.length > 0 && input[0].length > 0) {
            // Create a copy to avoid transfer issues
            const channelData = new Float32Array(input[0].length);
            channelData.set(input[0]);
            // Send the Float32Array to the main thread
            this.port.postMessage({ type: 'audio-data', audio: channelData }, [channelData.buffer]);
        }
        return true;
    }
}

registerProcessor('audio-processor', AudioProcessor);
