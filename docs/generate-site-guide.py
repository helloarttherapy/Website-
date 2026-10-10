from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor
from reportlab.platypus import Paragraph, Table, TableStyle
from reportlab.lib.styles import ParagraphStyle
from reportlab.graphics.shapes import Drawing, Rect, String, Line, Polygon
from reportlab.graphics import renderPDF, renderSVG

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/pdf'
OUT.mkdir(parents=True, exist_ok=True)
PDF=OUT/'Hello-Art-Therapy-Site-Setup.pdf'
W,H=A4
M=44; CW=W-2*M
INK=HexColor('#293047'); TEAL=HexColor('#475b60'); CYAN=HexColor('#97e7f7'); PALE=HexColor('#f1f7f7'); GREY=HexColor('#d9dee3'); MUTED=HexColor('#5c6372')
styles={
 'body':ParagraphStyle('body',fontName='Helvetica',fontSize=10,leading=15,textColor=INK,spaceAfter=8),
 'small':ParagraphStyle('small',fontName='Helvetica',fontSize=8.8,leading=12.5,textColor=INK),
 'head':ParagraphStyle('head',fontName='Helvetica-Bold',fontSize=13,leading=17,textColor=TEAL),
 'table':ParagraphStyle('table',fontName='Helvetica',fontSize=9.2,leading=13,textColor=INK),
 'code':ParagraphStyle('code',fontName='Courier',fontSize=9,leading=14,textColor=INK),
 'prompt':ParagraphStyle('prompt',fontName='Helvetica',fontSize=9.4,leading=13,textColor=INK,splitLongWords=True),
}
c=canvas.Canvas(str(PDF),pagesize=A4)
c.setTitle('Hello Art Therapy - Site setup and platform guide')
c.setAuthor('Hello Art Therapy')

def para(text,y,style='body',x=M,width=CW):
 p=Paragraph(text,styles[style]); _,h=p.wrap(width,H); p.drawOn(c,x,y-h); return y-h-8

def start(n,title,subtitle):
 c.setFillColor(CYAN); c.rect(0,H-14,W,14,fill=1,stroke=0)
 c.setFillColor(TEAL); c.setFont('Helvetica',9); c.drawString(M,H-45,'HELLO ART THERAPY  /  SITE SETUP')
 c.setFillColor(INK); c.setFont('Helvetica-Bold',27); c.drawString(M,H-88,title)
 y=para(subtitle,H-106,'body')
 c.setStrokeColor(GREY); c.line(M,39,W-M,39)
 c.setFont('Helvetica',8); c.setFillColor(MUTED); c.drawString(M,25,'Saved setup record  |  10 October 2026  |  Anna Worthington')
 c.drawRightString(W-M,25,str(n))
 return y-14

def heading(text,y):
 return para(text,y,'head')

def table(rows,widths,y,padding=7):
 cells=[[Paragraph(v,styles['table']) for v in row] for row in rows]
 t=Table(cells,colWidths=widths,hAlign='LEFT')
 t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),CYAN),('VALIGN',(0,0),(-1,-1),'TOP'),('TOPPADDING',(0,0),(-1,-1),padding),('BOTTOMPADDING',(0,0),(-1,-1),padding),('LEFTPADDING',(0,0),(-1,-1),10),('RIGHTPADDING',(0,0),(-1,-1),10),('LINEBELOW',(0,0),(-1,-1),.5,GREY)]))
 _,h=t.wrap(CW,H); t.drawOn(c,M,y-h); return y-h-20

def flow():
 d=Drawing(CW,410)
 def txt(x,y,s,size=9,bold=False):d.add(String(x,y,s,fontName='Helvetica-Bold' if bold else 'Helvetica',fontSize=size,fillColor=INK))
 def box(x,y,w,title,lines):
  d.add(Rect(x,y,w,66,rx=10,ry=10,fillColor=PALE,strokeColor=GREY,strokeWidth=.7))
  txt(x+11,y+46,title,10,True)
  for i,line in enumerate(lines):txt(x+11,y+29-i*12,line,8.4)
 def arrow(x1,y,x2,label=None):
  d.add(Line(x1,y,x2-4,y,strokeColor=TEAL,strokeWidth=1.2)); d.add(Polygon([x2,y,x2-6,y+3.5,x2-6,y-3.5],fillColor=TEAL,strokeColor=None))
  if label:txt(x1+2,y+10,label,7.5)
 gap=24; bw=(CW-2*gap)/3
 xs=[0,bw+gap,2*(bw+gap)]
 txt(0,394,'01  PUBLISH THE WEBSITE',10,True)
 box(xs[0],310,bw,'GitHub',['Website source','helloarttherapy / Website-'])
 box(xs[1],310,bw,'Astro build',['Edit locally and check','Generate static pages'])
 box(xs[2],310,bw,'Cloudflare Worker',['Wrangler deployment','hello-art-therapy'])
 arrow(bw,343,xs[1]);arrow(xs[1]+bw,343,xs[2])
 txt(0,277,'Publishing is manual. GitHub Actions checks changes; it does not deploy.',8.6)
 txt(0,242,'02  VISIT THE WEBSITE',10,True)
 box(xs[0],158,bw,'Visitor',['Opens Anna\'s website','on phone or desktop'])
 box(xs[1],158,bw,'Cloudflare DNS + TLS',['Finds the website','and provides HTTPS'])
 box(xs[2],158,bw,'Worker Static Assets',['Serves pages, images','and self-hosted fonts'])
 arrow(bw,191,xs[1]);arrow(xs[1]+bw,191,xs[2])
 txt(0,128,'GoDaddy holds the domain registration; its nameservers point to Cloudflare.',8.6)
 txt(0,94,'03  SEND A CONTACT MESSAGE',10,True)
 gap4=17; bw4=(CW-3*gap4)/4; xx=[i*(bw4+gap4) for i in range(4)]
 box(xx[0],8,bw4,'Contact form',['Visitor submits','an enquiry'])
 box(xx[1],8,bw4,'Worker endpoint',['Validates fields','and rate limits'])
 box(xx[2],8,bw4,'Cloudflare email',['Fixed website','sender address'])
 box(xx[3],8,bw4,'Anna\'s inbox',['Google Workspace','anna@hello...'])
 for i in range(3):arrow(xx[i]+bw4,41,xx[i+1])
 return d

y=start(1,'How the site works','A practical record of the live Astro website, platforms and update process.')
y=para('<b>Live site:</b> <link href="https://www.annaworthingtonarttherapy.com/" color="#475b60">www.annaworthingtonarttherapy.com</link><br/><b>Project:</b> Hello Art Therapy / H Art. Owner account: anna@helloarttherapy.com.',y)
d=flow();renderPDF.draw(d,c,M,y-410);renderSVG.drawToFile(d,str(OUT/'Hello-Art-Therapy-System-Flow.svg'));y-=430
y=para('Website files are served by Cloudflare. Contact messages are emailed directly to <b>anna@helloarttherapy.com</b>. The website does not store enquiry contents in a database.',y)
y=para('Squarespace supplied the original content and artwork. Its account and billing remain separate from the new live hosting.',y,'small')
c.showPage()

y=start(2,'Platforms and connections','Where each part lives and what it is responsible for.')
rows=[['<b>Platform</b>','<b>Role in this setup</b>'],['GoDaddy','Registers and renews <b>annaworthingtonarttherapy.com</b>. Nameservers delegate DNS to Cloudflare.'],['Cloudflare','Authoritative DNS, HTTPS certificates, redirects, Worker hosting, static assets and contact email delivery. Account: <b>anna@helloarttherapy.com</b>.'],['GitHub','Source repository: <link href="https://github.com/helloarttherapy/Website-" color="#475b60">helloarttherapy/Website-</link>. Main branch: <b>main</b>. GitHub Actions runs checks, a build and tests.'],['Astro + Node.js','Astro creates the static website. Use <b>Node.js 22</b> for maintenance. Images and Belleza / Tenor Sans fonts are bundled locally.'],['Google Workspace / Gmail','Receives contact enquiries at <b>anna@helloarttherapy.com</b>. The separate mail domain <b>helloarttherapy.com</b> keeps its existing Google mail setup.'],['Amazon','External purchase destination for <b>Art for the Everyday</b>. <link href="https://www.amazon.com.au/dp/B0HMHYSVPV" color="#475b60">amazon.com.au/dp/B0HMHYSVPV</link>'],['Spotify + YouTube','Links appear on all 18 articles and in the footer. Seven articles link to matching episodes; eleven link to the main show and channel.'],['Squarespace','Previous website platform. Public content was migrated; the old account and billing have not been cancelled.']]
y=table(rows,[113,CW-113],y)
y=heading('Domain and hosting details',y)
y=para('<b>Cloudflare nameservers</b><br/>andronicus.ns.cloudflare.com<br/>chelsea.ns.cloudflare.com<br/><br/><b>Worker:</b> hello-art-therapy<br/><b>Preview:</b> <link href="https://hello-art-therapy.hello-art-therapy.workers.dev/" color="#475b60">hello-art-therapy.hello-art-therapy.workers.dev</link>',y,'small')
y=para('Both root and www are connected as Worker custom domains. HTTP redirects to HTTPS. The root domain permanently redirects to www, retaining page paths and query strings.',y,'small')
c.showPage()

y=start(3,'Editing and publishing','Use this process whenever website copy, layout, links or artwork changes.')
y=heading('1. Edit the website files',y)
y=para('Local project folder:<br/><font face="Courier" size="9">/Users/administrator/Documents/ChatGPT/H Art</font>',y)
y=table([['<b>What to update</b>','<b>File or folder</b>'],['Migrated copy and articles','src/data/site.json'],['Page layouts, contact copy and book','src/pages/'],['Navigation and footer links','src/components/Header.astro<br/>src/components/Footer.astro'],['Colours, buttons and spacing','src/styles/global.css'],['Images and legacy redirects','public/images/ and public/_redirects'],['Search metadata','src/lib/seo.mjs and astro.config.mjs'],['Podcast / video destinations','src/data/podcast-episodes.json<br/>src/lib/content-layout.mjs'],['Contact delivery / hosting','worker/index.mjs and wrangler.jsonc']],[184,CW-184],y,padding=4)
y=heading('2. Preview and verify',y)
y=para('For a fresh checkout, install dependencies with <font face="Courier">npm ci</font>. Start a local preview while editing with <font face="Courier">npm run dev</font>. Before publishing, run:',y)
y=para('npm run check<br/>npm run build<br/>npm test',y,'code')
y=para('The migration tests read the built <b>dist</b> folder, so build before running them. Check the changed pages on desktop and mobile, along with navigation and links.',y,'small')
y=heading('3. Save to GitHub, then publish',y)
y=para('Review the diff, commit intended changes and push to <b>main</b>. Preserve unrelated local drafts. When drafts remain, build an isolated release from committed HEAD plus only intended changes. Publish the verified release using:',y)
y=para('npm run deploy',y,'code')
y=para('This builds the site and deploys with Wrangler profile <b>hello-art-therapy</b> to Anna\'s pinned Cloudflare account. A GitHub push alone does not publish the site.',y,'small')
y=heading('4. Check the live result',y)
y=para('Open the live website and verify the changed pages. For contact changes, submit a clearly labelled test and confirm it reaches Anna\'s inbox. Keep credentials out of source files and Git.',y)
if y < 57:
 raise ValueError(f'Publishing instructions overlap the footer: y={y:.1f}')
c.showPage()

y=start(4,'Site flow and upkeep','The main visitor routes, email configuration and recovery references.')
y=heading('Visitor flow',y)
y=para('<b>Homepage</b> introduces art therapy, benefits, Anna\'s offer and testimonials. The original main navigation leads to the following pages:',y)
y=table([['<b>Page</b>','<b>Live path</b>'],['What is Art Therapy?','/new-page'],['How it works','/how-it-works'],['About','/about-1'],['Blog and individual articles','/blog and the preserved dated article URLs'],['Contact','/contact'],['Art for the Everyday','/art-for-the-everyday<br/>Linked from the footer; Buy on Amazon opens Amazon.']],[184,CW-184],y)
y=heading('Contact email setup',y)
y=para('<b>Endpoint:</b> POST /api/contact<br/><b>From:</b> website@annaworthingtonarttherapy.com<br/><b>To:</b> anna@helloarttherapy.com<br/><b>Reply-To:</b> the visitor\'s email address<br/><b>Confirmation:</b> Thank you for message, I will be in touch shortly.',y)
y=para('Cloudflare Email Routing is enabled on the website domain with MX, SPF and DKIM records. Anna\'s inbox is a verified destination. Validation, a honeypot and a limit of 5 requests per 60 seconds help filter unwanted submissions. After email-provider acceptance, the form hides and the confirmation receives focus. Failure retains the form and message for retry.',y,'small')
y=heading('Troubleshooting and recovery',y)
y=para('<b>A recent edit is missing:</b> confirm the correct checkout was built and deployed; saving or pushing code is not enough.<br/><b>A contact message fails:</b> check Cloudflare\'s EMAIL binding and verified destination, then use the direct email link while delivery is repaired.<br/><b>Restore a previous version:</b> use Cloudflare\'s Worker deployment history, or rebuild and deploy a known Git commit.',y,'small')
y=para('<b>DNS backup:</b> migration/godaddy-dns-before-cloudflare.json<br/><b>Technical reference:</b> README.md and wrangler.jsonc in the GitHub repository.',y,'small')
y=para('Launch verification covered all 102 sitemap pages, canonical links, descriptions, fonts, redirects and the 404 response. Contact email delivery was confirmed in Anna\'s inbox. All 18 live articles now display Spotify and YouTube links. Search Console submission remains a separate follow-up.',y,'small')
c.showPage()

y=start(5,'Restarting in Codex','Paste the prompt below into a new Codex chat opened in the H Art project. Then send your next website request.')
y=para('A plain-text copy is also saved as <b>docs/Codex-Site-Handover.txt</b>. This is a dated snapshot: the new chat should inspect the repository before making changes.',y,'small')
prompt=(ROOT/'docs/Codex-Site-Handover.txt').read_text().strip()
for block in prompt.split('\n\n'):
 y=para(escape(block),y,'prompt')
if y < 57:
 raise ValueError(f'Handover prompt overlaps the footer: y={y:.1f}')
c.save()
print(PDF)
