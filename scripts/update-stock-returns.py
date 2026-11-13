"""Public market-only snapshot. Never reads portfolio or user inputs."""
import datetime as dt,json,math,time,urllib.request,urllib.parse
from pathlib import Path
SYMBOLS=['SPY','QQQ','VTI','VOO','SCHD','AAPL','MSFT','005930.KS','069500.KS']
path=Path('docs/stock-returns.json')
old=json.loads(path.read_text()) if path.exists() else {'version':1,'items':{}}
now=dt.datetime.now(dt.timezone.utc)
items=old.get('items',{})
for symbol in SYMBOLS:
    try:
        result=None
        for host in ['query1.finance.yahoo.com','query2.finance.yahoo.com']:
            try:
                url=f'https://{host}/v8/finance/chart/{urllib.parse.quote(symbol,safe="")}?range=max&interval=1d&events=div%2Csplits&includeAdjustedClose=true'
                req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
                with urllib.request.urlopen(req,timeout=25) as response: result=json.load(response)['chart']['result'][0]
                break
            except Exception: continue
        if not result: raise ValueError('source unavailable')
        prices=result['indicators']['adjclose'][0]['adjclose']
        pairs=[(dt.datetime.fromtimestamp(t,dt.timezone.utc).date(),float(p)) for t,p in zip(result['timestamp'],prices) if p is not None and math.isfinite(p) and p>0 and dt.datetime.fromtimestamp(t,dt.timezone.utc).date()<now.date()]
        pairs.sort();end_date,end=pairs[-1];cutoff=end_date.replace(year=end_date.year-30) if not(end_date.month==2 and end_date.day==29) else end_date.replace(year=end_date.year-30,day=28)
        start_date,start=next((x for x in pairs if x[0]>=cutoff),pairs[0]);years=(end_date-start_date).days/365.2425
        if years<1 or (now.date()-end_date).days>10: raise ValueError('insufficient or stale source')
        cagr=((end/start)**(1/years)-1)*100
        items[symbol]={'symbol':symbol,'name':result['meta'].get('longName',symbol),'currency':result['meta']['currency'],'startDate':str(start_date),'endDate':str(end_date),'years':round(years,4),'startAdjusted':start,'endAdjusted':end,'cagr':cagr,'basis':'adjusted-close','source':'Yahoo Finance','sourceUrl':f'https://finance.yahoo.com/quote/{symbol}/history/','fetchedAt':now.isoformat(),'error':None}
        print('Collected',symbol,str(start_date),str(end_date),round(cagr,4))
    except Exception:
        if symbol in items: items[symbol]['error']='refresh-failed'
        print('Unavailable',symbol)
    time.sleep(1)
snapshot={'version':1,'attemptedAt':now.isoformat(),'items':items}
path.write_text(json.dumps(snapshot,ensure_ascii=False,indent=2)+'\n')
print('STOCK_SNAPSHOT='+json.dumps(snapshot,ensure_ascii=False,separators=(',',':')))
