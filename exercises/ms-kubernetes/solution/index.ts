// Lösung ms-kubernetes
export type ServiceSpec = { name: string; image: string; port: number; replicas?: number; env?: Record<string, string> }

const probe = (path: string, port: number, periodSeconds: number) => ({
  httpGet: { path, port },
  periodSeconds,
  failureThreshold: 3,
})

/** Deployment und Service als Objekte. kubectl apply -f akzeptiert JSON genauso wie YAML. */
export const manifests = ({ name, image, port, replicas = 2, env = {} }: ServiceSpec) => {
  const labels = { 'app.kubernetes.io/name': name, 'app.kubernetes.io/part-of': 'werkstatt' }
  return [
    {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: { name, labels },
      spec: {
        replicas,
        selector: { matchLabels: { 'app.kubernetes.io/name': name } },
        template: {
          metadata: { labels },
          spec: {
            containers: [
              {
                name,
                image,
                ports: [{ containerPort: port }],
                env: [{ name: 'PORT', value: String(port) }, ...Object.entries(env).map(([key, value]) => ({ name: key, value }))],
                readinessProbe: probe('/health/ready', port, 5),
                livenessProbe: probe('/health/live', port, 10),
                resources: { requests: { cpu: '50m', memory: '64Mi' }, limits: { memory: '256Mi' } },
              },
            ],
          },
        },
      },
    },
    {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: { name, labels },
      spec: { selector: { 'app.kubernetes.io/name': name }, ports: [{ port: 80, targetPort: port }] },
    },
  ]
}

/** Als List-Objekt für eine Datei: node exercises/ms-kubernetes/solution/index.ts > catalog.json */
export const asList = (items: unknown[]) => ({ apiVersion: 'v1', kind: 'List', items })

if (import.meta.main) {
  console.log(JSON.stringify(asList(manifests({ name: 'catalog', image: 'werkstatt/catalog:1.0.0', port: 3001 })), null, 2))
}
