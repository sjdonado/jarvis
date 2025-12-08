package quotes

import (
	"encoding/json"
	"fmt"
	"io"
	"math/rand/v2"
	"net/http"
	"os"
	"time"
)

const (
	cachePath = "quotes.json"
	endpoint  = "https://gist.githubusercontent.com/sjdonado/66c22e7fafe4505bcbd7a167249bfd5f/raw/quotes.json"
)

type Quote struct {
	Quote  string `json:"quote"`
	Author string `json:"author"`
}

type Rotator struct {
	quotes    []Quote
	remaining []int
	shuffled  bool
	LastFetch time.Time
}

func NewRotator(qs []Quote) *Rotator {
	if len(qs) == 0 {
		return &Rotator{
			quotes:    []Quote{{Quote: "No quotes available", Author: ""}},
			remaining: []int{0},
			shuffled:  true,
			LastFetch: time.Time{},
		}
	}

	indices := make([]int, len(qs))
	for i := range indices {
		indices[i] = i
	}

	return &Rotator{
		quotes:    qs,
		remaining: indices,
		shuffled:  false,
		LastFetch: time.Now(),
	}
}

func (qr *Rotator) NextQuote() Quote {
	if len(qr.remaining) == 0 {
		// Restart cycle
		qr.remaining = make([]int, len(qr.quotes))
		for i := range qr.remaining {
			qr.remaining[i] = i
		}
		qr.shuffled = false
	}

	if !qr.shuffled {
		rand.Shuffle(len(qr.remaining), func(i, j int) {
			qr.remaining[i], qr.remaining[j] = qr.remaining[j], qr.remaining[i]
		})
		qr.shuffled = true
	}

	// Pick next quote from remaining
	idx := qr.remaining[0]
	qr.remaining = qr.remaining[1:]

	return qr.quotes[idx]
}

func LoadFromFile(path string) ([]Quote, time.Time, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, time.Time{}, err
	}
	var qs []Quote
	if err := json.Unmarshal(data, &qs); err != nil {
		return nil, time.Time{}, err
	}
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

// NewRotatorFromCache loads quotes from cache or endpoint and returns a rotator with last fetch time set.
func NewRotatorFromCache() (*Rotator, error) {
	qs, mod, err := LoadOrFetch()
	if err != nil {
		return nil, err
	}
	r := NewRotator(qs)
	r.LastFetch = mod
	return r, nil
}

// Refresh reloads quotes from cache/endpoint and resets rotation.
func (qr *Rotator) Refresh() error {
	qs, mod, err := LoadOrFetch()
	if err != nil {
		return err
	}
	qr.quotes = qs
	qr.remaining = make([]int, len(qs))
	for i := range qr.remaining {
		qr.remaining[i] = i
	}
	qr.shuffled = false
	qr.LastFetch = mod
	return nil
}
