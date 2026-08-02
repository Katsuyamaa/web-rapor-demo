import MetricWidget    from './MetricWidget'
import ApexChartWidget from './ApexChartWidget'
import RoutingWidget   from './RoutingWidget'

export default function Widget({ widget }) {
  const { widget_type } = widget

  if (widget_type === 'routing') return <RoutingWidget widget={widget} />
  if (widget_type === 'system')  return <MetricWidget widget={widget} />
  if (widget_type === 'metric')  return <MetricWidget widget={widget} />
  if (widget_type === 'chart') {
    return <ApexChartWidget widget={widget} />
  }
  return <MetricWidget widget={widget} />
}
