import http.server, socketserver
PORT = 8080
DIR  = "/Users/ariel/Desktop/outbound-app"
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw): super().__init__(*a, directory=DIR, **kw)
    def log_message(self, *a): pass
with socketserver.TCPServer(("", PORT), H) as s:
    s.serve_forever()
