// Preserve rejected round-one comparisons through explicit historical URLs.
if (['a','b','c'].includes(new URLSearchParams(location.search).get('direction') || '')) {
  void import('./preview');
} else {
  void import('./selected');
}
