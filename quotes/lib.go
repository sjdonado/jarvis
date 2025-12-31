package quotes

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"
)

const (
	cachePath        = "quotes.json"
	localStoragePath = "local_storage.json"
	refreshInterval  = 24 * time.Hour
	endpoint         = "https://gist.githubusercontent.com/sjdonado/66c22e7fafe4505bcbd7a167249bfd5f/raw/quotes.json"
)

func LoadFromFile(path string) ([]Quote, time.Time, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, time.Time{}, err
	}
	var qs []Quote
	if err := json.Unmarshal(data, &qs); err != nil {
		return nil, time.Time{}, err
	}
	qs = ensureIDs(qs)
	mod := time.Now()
	if fi, err := os.Stat(path); err == nil {
		mod = fi.ModTime()
	}
	return qs, mod, nil
}

func FetchToFile(path string) error {
	resp, err := http.Get(endpoint)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("bad status: %s", resp.Status)
	}
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}

func LoadOrFetch() ([]Quote, time.Time, error) {
	// Try to load from cache first
	qs, mod, err := LoadFromFile(cachePath)
	if err == nil {
		return qs, mod, nil
	}

	// If cache fails, fetch and cache
	if fetchErr := FetchToFile(cachePath); fetchErr != nil {
		return nil, time.Time{}, fmt.Errorf("failed to load quotes (no cache and fetch failed): %w", fetchErr)
	}

	// Load the freshly fetched quotes
	return LoadFromFile(cachePath)
}

func allowedIDSet(qs []Quote) map[int]struct{} {
	allowed := make(map[int]struct{}, len(qs))
	for _, q := range qs {
		allowed[q.ID] = struct{}{}
	}
	return allowed
}

func ensureIDs(qs []Quote) []Quote {
	if len(qs) == 0 {
		return qs
	}
	used := make(map[int]struct{}, len(qs))
	nextID := 1
	for i := range qs {
		id := qs[i].ID
		if id > 0 {
			if _, exists := used[id]; !exists {
				used[id] = struct{}{}
				continue
			}
		}
		for {
			if _, exists := used[nextID]; !exists {
				qs[i].ID = nextID
				used[nextID] = struct{}{}
				nextID++
				break
			}
			nextID++
		}
	}
	return qs
}

// NextDailyAtHour returns the next local time at the specified hour.
func NextDailyAtHour(hour int) time.Time {
	t := time.Now()
	y, m, d := t.Date()
	loc := t.Location()

	refreshHour := hour % 24
	if refreshHour < 0 {
		refreshHour += 24
	}

	candidate := time.Date(y, m, d, refreshHour, 0, 0, 0, loc)
	if !t.Before(candidate) {
		candidate = candidate.Add(refreshInterval)
	}
	log.Printf("Next quote refresh scheduled at %s", candidate.Format(time.RFC3339))
	return candidate
}
