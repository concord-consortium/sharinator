const agoUnits = [
	{ max: 2760000, value: 60000, name: 'minute', prev: 'a minute ago' }, // max: 46 minutes
	{ max: 72000000, value: 3600000, name: 'hour', prev: 'an hour ago' }, // max: 20 hours
	{ max: 518400000, value: 86400000, name: 'day', prev: 'yesterday' }, // max: 6 days
	{ max: 2419200000, value: 604800000, name: 'week', prev: 'last week' }, // max: 28 days
	{ max: 28512000000, value: 2592000000, name: 'month', prev: 'last month' }, // max: 11 months
	{ max: Infinity, value: 31536000000, name: 'year', prev: 'last year' }
]

export function ago(timestamp:number) {
  const diff = Math.abs(Date.now() - timestamp)
  if (diff < 60000) { // less than a minute
    return 'just now'
  }

  for (var i = 0; i < agoUnits.length; i++) {
    if (diff < agoUnits[i].max) {
      const val = Math.floor(diff / agoUnits[i].value)
      return val <= 1 ? agoUnits[i].prev : `${val} ${agoUnits[i].name}s ago`;
    }
  }
}