import { from, of } from 'rxjs';
import { pluck, tap, map, catchError } from 'rxjs/operators';
import { fakeAPIFetch } from './fake-backend/fake-backend.js';

const tenMin = 1000 /* ms */ * 60 /* sec */ * 10;
const cache = {};

export function fetchWithCache(url, axiosOptions) {
  const options = { ...axiosOptions, ...{ method: 'get' }, ...{ url } };
  if (cache[url] != undefined) {
    const diff = Date.now() - cache[url].lastPulled;
    if (diff < tenMin) {
      return from(
        Promise.resolve().then(() => {
          return cache[url].value;
        })
      );
    }
  }
  return from(fakeAPIFetch(options)).pipe(
    tap((response) => {
      // Cache the main response
      cache[options.url] = {
        lastPulled: Date.now(),
        value: response,
      };
      // Cache each individual item if applicable
      if (response.results && Array.isArray(response.results)) {
        response.results.forEach((item) => {
          if (item.url) {
            cache[item.url] = {
              lastPulled: Date.now(),
              value: item,
            };
          }
        });
      }
    }),
    catchError(error => {
      // Handle error here
      console.error('Fetch error:', error);
      return of(null); // Return a null observable as a fallback
    })
  );
}
