<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Analytics Cache TTL
    |--------------------------------------------------------------------------
    |
    | How long (in seconds) to cache dashboard analytics results.
    | Default: 300 seconds (5 minutes).
    | Set to 0 to disable caching entirely (useful during development).
    |
    */
    'cache_ttl' => (int) env('ANALYTICS_CACHE_TTL', 300),
];
