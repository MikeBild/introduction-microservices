// Lesson ms-kubernetes: What changes from Compose to Kubernetes?
// Duration: about 20 minutes
//
// Kubernetes describes the desired state: a Deployment keeps n Pods alive,
// a Service gives them a stable name. The health checks from Compose become probes.
// More on images and clusters: workshop “Docker & Kubernetes”.
//
// Task: manifests(spec) returns [Deployment, Service] for one service of the workshop shop.
// 1. Deployment apps/v1: replicas (default 2), labels app.kubernetes.io/name and app.kubernetes.io/part-of: werkstatt,
//    a matching selector, one container with image, containerPort, env PORT plus spec.env.
// 2. readinessProbe on /health/ready, livenessProbe on /health/live (httpGet on the port).
// 3. resources: requests cpu 50m and memory 64Mi, limits memory 256Mi.
// 4. Service v1: selector on app.kubernetes.io/name, port 80 → targetPort.
//
// Check: npm test -- ms-kubernetes   and   node exercises/ms-kubernetes/solution/index.ts > catalog.json
export type ServiceSpec = { name: string; image: string; port: number; replicas?: number; env?: Record<string, string> }

export const manifests = (spec: ServiceSpec): Array<Record<string, unknown>> => {
  throw new Error('TODO: Deployment und Service')
}

export const asList = (items: unknown[]) => ({ apiVersion: 'v1', kind: 'List', items })
