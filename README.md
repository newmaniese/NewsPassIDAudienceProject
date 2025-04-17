# NewsPassID

First-Party Identity and Targeting Solution for Publishers

## Features

- First-party ID generation and management
- Segment-based targeting
- GPP consent integration
- Meta tag injection for segments
- Publisher-specific namespace support
- GDPR and CCPA compliant
- Lightweight and fast implementation
- Seamless integration with Google Ad Manager and other ad platforms

## Quick Start

### Option 1: Async Implementation (Recommended)

```html
<script>
  // Publisher configuration
  var NEWSPASS_CONFIG = {
    namespace: 'your-publisher',
    lambdaEndpoint: 'https://npid.gmg.io/newspassid'
  };
  
  // Initialize the queue
  window.NewsPassIDQ = window.NewsPassIDQ || [];
  window.newspassid = window.newspassid || {
    setID: function(id) {
      window.NewsPassIDQ.push(['setID', id]);
    },
    // Other stub methods...
  };
  
  // Load the script
  (function() {
    var script = document.createElement('script');
    script.src = 'https://npid.gmg.io/newspassid-async.min.js';
    script.async = true;
    var head = document.head || document.getElementsByTagName('head')[0];
    head.appendChild(script);
  })();
</script>
```

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Start development server
npm run dev
```
