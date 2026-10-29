// Lektion ms-kubernetes: Was ändert sich von Compose zu Kubernetes?
// Dauer: etwa 20 Minuten
//
// Kubernetes beschreibt den gewünschten Zustand: ein Deployment hält n Pods am Leben,
// ein Service gibt ihnen einen stabilen Namen. Die Health Checks aus Compose werden zu Probes.
// Mehr zu Images und Clustern: Workshop Container.
//
// Aufgabe: manifests(spec) liefert [Deployment, Service] für einen Service des Werkstatt-Shops.
// 1. Deployment apps/v1: replicas (Default 2), Labels app.kubernetes.io/name und app.kubernetes.io/part-of: werkstatt,
//    selector passend, ein Container mit image, containerPort, env PORT plus spec.env.
// 2. readinessProbe auf /health/ready, livenessProbe auf /health/live (httpGet auf den Port).
// 3. resources: requests cpu 50m und memory 64Mi, limits memory 256Mi.
// 4. Service v1: selector auf app.kubernetes.io/name, Port 80 → targetPort.
//
// Prüfen: npm test -- ms-kubernetes   und   node exercises/ms-kubernetes/solution/index.ts > catalog.json
export type ServiceSpec = { name: string; image: string; port: number; replicas?: number; env?: Record<string, string> }

export const manifests = (spec: ServiceSpec): Array<Record<string, unknown>> => {
  throw new Error('TODO: Deployment und Service')
}

export const asList = (items: unknown[]) => ({ apiVersion: 'v1', kind: 'List', items })
