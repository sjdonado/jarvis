package quotes

import (
	"encoding/json"
	"os"
	"sort"
	"time"
)

type localStorage struct {
	IDs         []int  `json:"ids"`
	LastRefresh string `json:"last_refresh"`
}

func loadLocalStorage(allowed map[int]struct{}) (map[int]struct{}, time.Time) {
	visited := make(map[int]struct{})
	var lastRefresh time.Time
	data, err := os.ReadFile(localStoragePath)
	if err != nil {
		return visited, lastRefresh
	}
	var state localStorage
	if err := json.Unmarshal(data, &state); err != nil {
		return visited, lastRefresh
	}
	for _, id := range state.IDs {
		if _, ok := allowed[id]; ok {
			visited[id] = struct{}{}
		}
	}
	if state.LastRefresh != "" {
		if parsed, err := time.Parse(time.RFC3339, state.LastRefresh); err == nil {
			lastRefresh = parsed
		}
	}
	return visited, lastRefresh
}

func saveLocalStorage(visited map[int]struct{}, lastRefresh time.Time) error {
	ids := make([]int, 0, len(visited))
	for id := range visited {
		ids = append(ids, id)
	}
	sort.Ints(ids)
	state := localStorage{IDs: ids}
	if !lastRefresh.IsZero() {
		state.LastRefresh = lastRefresh.UTC().Format(time.RFC3339)
	}
	data, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return err
	}
	data = append(data, '\n')
	return os.WriteFile(localStoragePath, data, 0644)
}
