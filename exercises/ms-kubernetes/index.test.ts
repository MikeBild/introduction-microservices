import { describe, expect, it } from 'vitest'
import { manifests } from '#ex/ms-kubernetes'

const [deployment, service] = (() => {
  try {
    return manifests({ name: 'catalog', image: 'werkstatt/catalog:1.0.0', port: 3001, env: { LOG_LEVEL: 'info' } }) as any[]
  } catch {
    return []
  }
})()

describe('Deployment', () => {
  it('hält zwei Replicas mit passenden Labels', () => {
    expect(deployment).toMatchObject({ apiVersion: 'apps/v1', kind: 'Deployment', metadata: { name: 'catalog' } })
    expect(deployment.spec.replicas).toBe(2)
    expect(deployment.spec.selector.matchLabels).toEqual({ 'app.kubernetes.io/name': 'catalog' })
    expect(deployment.spec.template.metadata.labels).toMatchObject({
      'app.kubernetes.io/name': 'catalog',
      'app.kubernetes.io/part-of': 'werkstatt',
    })
  })

  it('startet den Container mit Port und Umgebung', () => {
    const [container] = deployment.spec.template.spec.containers
    expect(container).toMatchObject({ name: 'catalog', image: 'werkstatt/catalog:1.0.0', ports: [{ containerPort: 3001 }] })
    expect(container.env).toEqual(
      expect.arrayContaining([
        { name: 'PORT', value: '3001' },
        { name: 'LOG_LEVEL', value: 'info' },
      ]),
    )
  })

  it('nutzt die Health Checks als Probes und setzt Ressourcen', () => {
    const [container] = deployment.spec.template.spec.containers
    expect(container.readinessProbe.httpGet).toEqual({ path: '/health/ready', port: 3001 })
    expect(container.livenessProbe.httpGet).toEqual({ path: '/health/live', port: 3001 })
    expect(container.resources).toEqual({ requests: { cpu: '50m', memory: '64Mi' }, limits: { memory: '256Mi' } })
  })
})

describe('Service', () => {
  it('gibt den Pods einen stabilen Namen auf Port 80', () => {
    expect(service).toMatchObject({ apiVersion: 'v1', kind: 'Service', metadata: { name: 'catalog' } })
    expect(service.spec.selector).toEqual({ 'app.kubernetes.io/name': 'catalog' })
    expect(service.spec.ports).toEqual([{ port: 80, targetPort: 3001 }])
  })
})
