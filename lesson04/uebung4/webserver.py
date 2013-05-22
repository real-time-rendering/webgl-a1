#Copyright Jon Berg , turtlemeat.com

import string,cgi,time
from os import curdir, sep
from BaseHTTPServer import BaseHTTPRequestHandler, HTTPServer
#import pri

class MyHandler(BaseHTTPRequestHandler):

	def do_GET(self):
		try:
			if(self.path == '/'):
				self.path = '/index.html'
			if self.path.endswith(".html"):
				f = open(curdir + sep + self.path)
				self.send_response(200)
				self.send_header('Content-Type',	'text/html')
				self.end_headers()
				self.wfile.write(f.read())
				f.close()
				return
			elif ( self.path.endswith(".js") ):
				f = open(curdir + sep + self.path)
				self.send_response(200)
				self.send_header('Content-Type',	'text/plain')
				self.end_headers()
				self.wfile.write(f.read())
				f.close()
				return
			elif ( self.path.endswith(".css") ):
				f = open(curdir + sep + self.path)
				self.send_response(200)
				self.send_header('Content-Type',	'text/css')
				self.end_headers()
				self.wfile.write(f.read())
				f.close()
				return
			elif ( self.path.endswith(".gif") ):
				f = open(curdir + sep + self.path,'rb')
				self.send_response(200)
				self.send_header('Content-Type',	'image/gif')
				self.end_headers()
				self.wfile.write(f.read())
				f.close()
				return
			elif ( self.path.endswith(".jpeg") or self.path.endswith(".jpg") ):
				f = open(curdir + sep + self.path,'rb')
				self.send_response(200)
				self.send_header('Content-Type',	'image/jpeg')
				self.end_headers()
				self.wfile.write(f.read())
				f.close()
				return
			else:
				print("-----------------------------------------------")
				print("No handler implemented for file request "+self.path)
				print("-----------------------------------------------")
							
			return
				
		except IOError:
			self.send_error(404,'File Not Found: %s' % self.path)
	 

	def do_POST(self):
		global rootnode
		try:
			ctype, pdict = cgi.parse_header(self.headers.getheader('content-type'))
			if ctype == 'multipart/form-data':
				query=cgi.parse_multipart(self.rfile, pdict)
			self.send_response(301)
			
			self.end_headers()
			upfilecontent = query.get('upfile')
			print("filecontent", upfilecontent[0])
			self.wfile.write("<HTML>POST OK.<BR><BR>");
			self.wfile.write(upfilecontent[0]);
			
		except :
			pass

def main():
	try:
		server = HTTPServer(('', 8080), MyHandler)
		print('started httpserver...')
		server.serve_forever()
	except KeyboardInterrupt:
		print('^C received, shutting down server')
		server.socket.close()

if __name__ == '__main__':
	main()

