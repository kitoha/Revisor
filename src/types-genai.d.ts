declare module '@google/genai' {
  export class GoogleGenAI {
    constructor(config?: {
      apiKey?: string;
      vertexai?: boolean;
      project?: string;
      location?: string;
      apiVersion?: string;
    });
    models: {
      generateContent(request: { model: string; contents: any }): Promise<any>;
    };
  }
}


