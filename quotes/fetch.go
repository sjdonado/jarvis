package quotes

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
)

const (
	quotesPath = "quotes.json"
	endpoint   = "https://gist.githubusercontent.com/sjdonado/66c22e7fafe4505bcbd7a167249bfd5f/raw/quotes.json"
)

func LoadFromFile(path string) ([]Quote, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var qs []Quote
	if err := json.Unmarshal(data, &qs); err != nil {
		return nil, err
	}
	if _, err := validateQuotes(qs); err != nil {
		log.Printf("Invalid quotes file %q: %v", path, err)
		return nil, err
	}

	return qs, nil
}

func FetchAndCache() error {
	resp, err := http.Get(endpoint)
	if err != nil {
		log.Printf("Failed to fetch quotes: %v", err)
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		err := fmt.Errorf("bad status: %s", resp.Status)
		log.Printf("Failed to fetch quotes: %v", err)
		return err
	}

	var qs []Quote
	decoder := json.NewDecoder(resp.Body)
	if err := decoder.Decode(&qs); err != nil {
		log.Printf("Failed to decode quotes response: %v", err)
		return err
	}

	if _, err := validateQuotes(qs); err != nil {
		log.Printf("Invalid fetched quotes payload: %v", err)
		return err
	}

	data, err := json.Marshal(qs)
	if err != nil {
		log.Printf("Failed to marshal quotes: %v", err)
		return err
	}

	if err := os.WriteFile(quotesPath, data, 0644); err != nil {
		return err
	}

	return nil
}

func validateQuotes(qs []Quote) (map[int]struct{}, error) {
	allowed := make(map[int]struct{}, len(qs))
	for i := range qs {
		id := qs[i].ID
		if id <= 0 {
			return nil, fmt.Errorf("quote at index %d has invalid id %d", i, id)
		}
		if _, exists := allowed[id]; exists {
			return nil, fmt.Errorf("duplicate quote id %d found at index %d", id, i)
		}
		allowed[id] = struct{}{}
	}
	return allowed, nil
}
