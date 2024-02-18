# Amazon Vine Explorer

Private fork of https://github.com/Amazon-Vine-Explorer/AmazonVineExplorer<br />
browntiger @ gmail<br />

Following improvement were added:<br />
1: Tax resolver - fully functional, resolves visible items taxes. Not all taxes for 35000 items. <br />
2: Removed pointless cleanup database every 20 minutes.<br />
3: Added probability tax resolver.<br />
4: Added #database.update(false) to stop terrorizing indexedDb.<br />
5: Generate the correct first page url for scanning.<br />
6: Added national tax formatter.<br />
7: Added reset scanner from page one *if* it was offline for an hour.<br />
8: Corrected the syntax error when opening IndexedDb.<br />
