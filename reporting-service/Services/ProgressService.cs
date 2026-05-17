using System.Collections.Concurrent;

namespace McVill.ReportService.Services;

public class ProgressService
{
    readonly ConcurrentDictionary<string, (int done, int total)> _map = new();

    public void Init(string token, int total) => _map[token] = (0, total);

    public void Increment(string token) =>
        _map.AddOrUpdate(token, (1, 0), (_, v) => (v.done + 1, v.total));

    public (int done, int total) Get(string token) =>
        _map.TryGetValue(token, out var v) ? v : (0, 0);

    public void Remove(string token) => _map.TryRemove(token, out _);
}
