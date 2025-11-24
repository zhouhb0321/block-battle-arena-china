import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface InputEvent {
  timestamp: number;
  key: string;
  type: 'press' | 'release';
  latency: number;
}

const InputGraph: React.FC = () => {
  const [events, setEvents] = useState<InputEvent[]>([]);
  const [avgLatency, setAvgLatency] = useState(0);
  const startTime = useRef(Date.now());

  useEffect(() => {
    const handleKeyEvent = (e: KeyboardEvent, type: 'press' | 'release') => {
      const timestamp = Date.now() - startTime.current;
      const latency = performance.now() % 10; // Simulated latency

      setEvents(prev => {
        const newEvents = [
          ...prev,
          {
            timestamp,
            key: e.code,
            type,
            latency
          }
        ].slice(-50); // Keep last 50 events

        // Calculate average latency
        const latencies = newEvents.map(ev => ev.latency);
        const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        setAvgLatency(avg);

        return newEvents;
      });
    };

    const onKeyDown = (e: KeyboardEvent) => handleKeyEvent(e, 'press');
    const onKeyUp = (e: KeyboardEvent) => handleKeyEvent(e, 'release');

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const chartData = events.map(event => ({
    time: event.timestamp / 1000,
    latency: event.latency
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">输入延迟分析</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center p-2 bg-muted rounded">
            <div className="text-muted-foreground">输入次数</div>
            <div className="font-bold">{events.length}</div>
          </div>
          <div className="text-center p-2 bg-muted rounded">
            <div className="text-muted-foreground">平均延迟</div>
            <div className="font-bold">{avgLatency.toFixed(2)}ms</div>
          </div>
          <div className="text-center p-2 bg-muted rounded">
            <div className="text-muted-foreground">最高延迟</div>
            <div className="font-bold">
              {events.length > 0 ? Math.max(...events.map(e => e.latency)).toFixed(2) : 0}ms
            </div>
          </div>
        </div>

        {events.length > 0 && (
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" label={{ value: '时间 (s)', position: 'insideBottom', offset: -5 }} />
              <YAxis label={{ value: '延迟 (ms)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Line type="monotone" dataKey="latency" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}

        <div className="text-xs text-muted-foreground text-center">
          按任意键开始记录输入数据
        </div>
      </CardContent>
    </Card>
  );
};

export default InputGraph;
