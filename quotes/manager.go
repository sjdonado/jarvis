package quotes

import (
	"log"
	"math/rand/v2"
	"time"
)

type Quote struct {
	ID     int    `json:"id"`
	Quote  string `json:"quote"`
	Author string `json:"author"`
}

type Manager struct {
	quotes      []Quote
	visited     map[int]struct{}
	lastRefresh time.Time
	LastFetch   time.Time
}

func NewManager(qs []Quote) *Manager {
	if len(qs) == 0 {
		return &Manager{
			quotes:    []Quote{{ID: 1, Quote: "No quotes available", Author: ""}},
			visited:   map[int]struct{}{},
			LastFetch: time.Time{},
		}
	}

	qs = ensureIDs(qs)
	allowed := allowedIDSet(qs)
	visited, lastRefresh := loadLocalStorage(allowed)

	return &Manager{
		quotes:      qs,
		visited:     visited,
		lastRefresh: lastRefresh,
		LastFetch:   time.Now(),
	}
}

// NewManagerFromCache loads quotes from cache or endpoint and returns a manager with last fetch time set.
func NewManagerFromCache() (*Manager, error) {
	qs, mod, err := LoadOrFetch()
	if err != nil {
		return nil, err
	}
	r := NewManager(qs)
	r.LastFetch = mod
	return r, nil
}

func (qm *Manager) Next() Quote {
	if len(qm.quotes) == 0 {
		return Quote{ID: 1, Quote: "No quotes available", Author: ""}
	}
	if qm.visited == nil {
		qm.visited = make(map[int]struct{})
	}

	available := qm.availableQuotes()
	if len(available) == 0 {
		// Restart cycle.
		qm.visited = make(map[int]struct{})
		_ = saveLocalStorage(qm.visited, qm.lastRefresh)
		available = qm.quotes
	}

	chosen := available[rand.IntN(len(available))]
	qm.visited[chosen.ID] = struct{}{}
	_ = saveLocalStorage(qm.visited, qm.lastRefresh)

	log.Printf("Quote refreshed at %s: %q — %s", time.Now().Format(time.RFC3339), chosen.Quote, chosen.Author)

	return chosen
}

// Refresh reloads quotes from cache/endpoint at most once per 24h and keeps the visit history.
func (qm *Manager) Refresh() error {
	if !qm.shouldRefresh() {
		return nil
	}
	qs, mod, err := LoadOrFetch()
	if err != nil {
		return err
	}
	qs = ensureIDs(qs)
	qm.quotes = qs
	qm.LastFetch = mod
	qm.lastRefresh = time.Now()

	allowed := allowedIDSet(qs)
	if qm.visited == nil {
		qm.visited = make(map[int]struct{})
	}
	for id := range qm.visited {
		if _, ok := allowed[id]; !ok {
			delete(qm.visited, id)
		}
	}
	_ = saveLocalStorage(qm.visited, qm.lastRefresh)
	return nil
}

func (qm *Manager) availableQuotes() []Quote {
	if len(qm.visited) == 0 {
		return qm.quotes
	}
	available := make([]Quote, 0, len(qm.quotes))
	for _, q := range qm.quotes {
		if _, seen := qm.visited[q.ID]; !seen {
			available = append(available, q)
		}
	}
	return available
}

func (qm *Manager) shouldRefresh() bool {
	if qm.lastRefresh.IsZero() {
		return true
	}
	return time.Since(qm.lastRefresh) >= refreshInterval
}
