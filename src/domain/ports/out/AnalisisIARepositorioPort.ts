export interface AnalisisIARepositorioPort {
  buscar(hogarId: string, fingerprint: string): Promise<string | null>;
  guardar(hogarId: string, fingerprint: string, texto: string): Promise<void>;
}
