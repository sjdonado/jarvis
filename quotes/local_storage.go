package quotes

import (
	"encoding/json"
	"os"
	"sort"
	"time"
)

const (
	localStoragePath = "local_storage.json"
	refreshInterval  = 24 * time.Hour
	refreshGrace     = time.Minute
)

type localStorage struct {
	CurrentID   int    `json:"current_id"`
	Visited     []int  `json:"visited"`
	LastRefresh string `json:"last_refresh"`
	LastNext    string `json:"last_next"`
}

func loadLocalStorage() (int, map[int]struct{}, time.Time, time.Time) {
	visited := make(map[int]struct{})
	var lastRefresh time.Time
	var lastNext time.Time
	var currentID int
	data, err := os.ReadFile(localStoragePath)
	if err != nil {
		return currentID, visited, lastRefresh, lastNext
	}
	var state localStorage
	if err := json.Unmarshal(data, &state); err != nil {
		return currentID, visited, lastRefresh, lastNext
	}
	currentID = state.CurrentID
	ids := state.Visited
	for _, id := range ids {
		visited[id] = struct{}{}
	}
	if currentID != 0 {
		delete(visited, currentID)
	}
	if state.LastRefresh != "" {
		if parsed, err := time.Parse(time.RFC3339, state.LastRefresh); err == nil {
			lastRefresh = parsed
		}
	}
	if state.LastNext != "" {
		if parsed, err := time.Parse(time.RFC3339, state.LastNext); err == nil {
			lastNext = parsed
		}
	}
	return currentID, visited, lastRefresh, lastNext
}

func saveLocalStorage(currentID int, visited map[int]struct{}, lastRefresh time.Time, lastNext time.Time) error {
	ids := make([]int, 0, len(visited))
	for id := range visited {
		ids = append(ids, id)
	}
	sort.Ints(ids)
	state := localStorage{CurrentID: currentID, Visited: ids}
	if !lastRefresh.IsZero() {
		state.LastRefresh = lastRefresh.UTC().Format(time.RFC3339)
	}
	if !lastNext.IsZero() {
		state.LastNext = lastNext.UTC().Format(time.RFC3339)
	}
	data, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return err
	}
	data = append(data, '\n')
	return os.WriteFile(localStoragePath, data, 0644)
}
