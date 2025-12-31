package quotes

import (
	"log"
	"math/rand/v2"
	"os"
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
	currentID   int
	lastRefresh time.Time
	lastNext    time.Time
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

	currentID, visited, lastRefresh, lastNext := loadLocalStorage()

	return &Manager{
		quotes:      qs,
		visited:     visited,
		currentID:   currentID,
		lastRefresh: lastRefresh,
		lastNext:    lastNext,
		LastFetch:   time.Now(),
	}
}

// NewManagerFromCache loads quotes from cache or endpoint and returns a manager with last fetch time set.
func NewManagerFromCache() (*Manager, error) {
	qs, err := LoadFromFile(quotesPath)
	if err != nil {
		if fetchErr := FetchAndCache(); fetchErr != nil {
			return nil, fetchErr
		}
		qs, err = LoadFromFile(quotesPath)
		if err != nil {
			return nil, err
		}
	}
	r := NewManager(qs)
	if fi, err := os.Stat(quotesPath); err == nil {
		r.LastFetch = fi.ModTime()
	}
	return r, nil
}

func (qm *Manager) Next() Quote {
	if len(qm.quotes) == 0 {
		return Quote{ID: 1, Quote: "No quotes available", Author: ""}
	}
	if qm.visited == nil {
		qm.visited = make(map[int]struct{})
	}

	current, hasCurrent := qm.quoteByID(qm.currentID)
	if hasCurrent && !qm.shouldAdvance() {
		return current
	}

	available := qm.availableQuotes(qm.currentID)
	if len(available) == 0 {
		// Restart cycle.
		qm.visited = make(map[int]struct{})
		available = qm.availableQuotes(qm.currentID)
	}
	if len(available) == 0 {
		if hasCurrent {
			return current
		}
		return Quote{ID: 1, Quote: "No quotes available", Author: ""}
	}

	if hasCurrent {
		qm.visited[current.ID] = struct{}{}
	}
	chosen := available[rand.IntN(len(available))]
	qm.currentID = chosen.ID
	qm.lastNext = time.Now()
	_ = saveLocalStorage(qm.currentID, qm.visited, qm.lastRefresh, qm.lastNext)

	log.Printf("Quote refreshed at %s: %q — %s", time.Now().Format(time.RFC3339), chosen.Quote, chosen.Author)

	return chosen
}

// Refresh reloads quotes from cache/endpoint at most once per 24h and keeps the visit history.
func (qm *Manager) Refresh() error {
	if !qm.shouldRefresh() {
		return nil
	}
	if err := FetchAndCache(); err != nil {
		return err
	}
	qs, err := LoadFromFile(quotesPath)
	if err != nil {
		return err
	}
	qm.quotes = qs
	if fi, err := os.Stat(quotesPath); err == nil {
		qm.LastFetch = fi.ModTime()
	}
	qm.lastRefresh = time.Now()

	if qm.visited == nil {
		qm.visited = make(map[int]struct{})
	}
	_ = saveLocalStorage(qm.currentID, qm.visited, qm.lastRefresh, qm.lastNext)
	return nil
}

func (qm *Manager) availableQuotes(excludeID int) []Quote {
	available := make([]Quote, 0, len(qm.quotes))
	for _, q := range qm.quotes {
		if excludeID != 0 && q.ID == excludeID {
			continue
		}
		if _, seen := qm.visited[q.ID]; !seen {
			available = append(available, q)
		}
	}
	return available
}

func (qm *Manager) quoteByID(id int) (Quote, bool) {
	if id == 0 {
		return Quote{}, false
	}
	for _, q := range qm.quotes {
		if q.ID == id {
			return q, true
		}
	}
	return Quote{}, false
}

func (qm *Manager) shouldRefresh() bool {
	if qm.lastRefresh.IsZero() {
		return true
	}
	return time.Since(qm.lastRefresh) >= refreshInterval
}

func (qm *Manager) shouldAdvance() bool {
	if qm.lastNext.IsZero() {
		return true
	}
	return time.Since(qm.lastNext) >= refreshInterval
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
