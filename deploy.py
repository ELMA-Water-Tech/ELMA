#!/usr/bin/env python3
"""
Simple deployment script for ELMA Platform
Starts a production-ready HTTP server
"""

import http.server
import socketserver
import os
import sys
from pathlib import Path

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Custom handler for better MIME types and security headers"""
    
    def end_headers(self):
        # Add security headers
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('X-XSS-Protection', '1; mode=block')
        super().end_headers()
    
    def guess_type(self, path):
        """Better MIME type detection"""
        mimetype, encoding = super().guess_type(path)
        
        # Fix common MIME types
        if path.endswith('.geojson'):
            return 'application/geo+json', encoding
        elif path.endswith('.js'):
            return 'application/javascript', encoding
        elif path.endswith('.css'):
            return 'text/css', encoding
        
        return mimetype, encoding

def main():
    # Change to the script directory
    os.chdir(Path(__file__).parent)
    
    # Default port
    port = 8080
    
    # Check if port is specified as command line argument
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print(f"Invalid port number: {sys.argv[1]}")
            sys.exit(1)
    
    # Create server
    with socketserver.TCPServer(("", port), CustomHTTPRequestHandler) as httpd:
        print(f"🚀 ELMA Platform is running at:")
        print(f"   Local:    http://localhost:{port}")
        print(f"   Network:  http://0.0.0.0:{port}")
        print(f"")
        print(f"📁 Serving files from: {os.getcwd()}")
        print(f"🛑 Press Ctrl+C to stop the server")
        print(f"")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Server stopped by user")
            httpd.shutdown()

if __name__ == "__main__":
    main()
