import { GoogleGenerativeAI } from "@google/generative-ai";

export class GeminiLiveService {
  private static instance: GeminiLiveService;
  private client: any = null;
  private session: any = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private audioWorkletNode: AudioWorkletNode | null = null;
  private isConnected: boolean = false;
  private isConnecting: boolean = false;

  // Guardia global para evitar múltiples conexiones (React StrictMode)
  private static isGlobalConnecting: boolean = false;

  private constructor() {}

  public static getInstance(): GeminiLiveService {
    if (!GeminiLiveService.instance) {
      GeminiLiveService.instance = new GeminiLiveService();
    }
    return GeminiLiveService.instance;
  }

  public async connect(apiKey: string, model: string, systemInstruction: string) {
    if (this.isConnected || this.isConnecting || GeminiLiveService.isGlobalConnecting) {
      console.log("⚠️ Gemini Live: Conexión ya activa o en proceso.");
      return;
    }

    try {
      this.isConnecting = true;
      GeminiLiveService.isGlobalConnecting = true;
      
      console.log(`🔌 Gemini Live [ERP]: Conectando con modelo [${model}]`);
      
      this.client = new GoogleGenerativeAI(apiKey);
      const generativeModel = this.client.getGenerativeModel({ 
        model,
        systemInstruction: { parts: [{ text: systemInstruction }] }
      });

      // Configuración de chat con audio nativo (v1beta)
      this.session = await generativeModel.startChat({
        history: [],
        generationConfig: {
          responseMimeType: "audio/pcm",
        }
      });

      this.isConnected = true;
      console.log("🔌 Gemini Live [ERP]: Conectado exitosamente");
      return this.session;

    } catch (error) {
      console.error("❌ Gemini Live [ERP]: Error de conexión", error);
      this.cleanup();
      throw error;
    } finally {
      this.isConnecting = false;
      GeminiLiveService.isGlobalConnecting = false;
    }
  }

  public async startAudioStreaming(onAudioData: (data: Int16Array) => void) {
    try {
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      await this.audioContext.audioWorklet.addModule('/audio-processor.js');
      
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.audioWorkletNode = new AudioWorkletNode(this.audioContext, 'audio-processor');

      this.audioWorkletNode.port.onmessage = (event) => {
        if (event.data.type === 'audio-data' && this.isConnected && this.session) {
          // En v1beta el payload de audio es directo
          try {
            this.session.sendRealtimeInput([{
              audio: {
                data: this.arrayBufferToBase64(event.data.audio),
                mimeType: "audio/pcm;rate=16000"
              }
            }]);
          } catch (e) {
            console.warn("⚠️ Error enviando audio (posible socket cerrado)");
          }
          onAudioData(new Int16Array(event.data.audio));
        }
      };

      source.connect(this.audioWorkletNode);
      this.audioWorkletNode.connect(this.audioContext.destination);

    } catch (error) {
      console.error("❌ Gemini Live [ERP]: Error en streaming de audio", error);
      throw error;
    }
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  public cleanup() {
    console.log("🔌 Gemini Live [ERP]: Ejecutando limpieza de recursos...");
    
    this.isConnected = false;
    this.isConnecting = false;
    GeminiLiveService.isGlobalConnecting = false;

    if (this.audioWorkletNode) {
      this.audioWorkletNode.disconnect();
      this.audioWorkletNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => {
        track.enabled = false;
        track.stop();
      });
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close().catch(console.error);
      this.audioContext = null;
    }

    this.session = null;
    this.client = null;
  }
}

export const geminiLiveService = GeminiLiveService.getInstance();
