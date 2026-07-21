import http.server
import os
import socketserver

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

with socketserver.TCPServer(("127.0.0.1", 5173), Handler) as httpd:
    print("Serving", ROOT, "on http://127.0.0.1:5173")
    httpd.serve_forever()
