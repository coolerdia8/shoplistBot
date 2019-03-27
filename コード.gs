// プロパティ取得
var PROPERTIES = PropertiesService.getScriptProperties();

//トークンを取得
var LINE_ACCESS_TOKEN = PROPERTIES.getProperty('LINE_ACCESS_TOKEN');//アクセストークンを記入

//ログ出力用にGoogle Docs連携する
//var GOOGLE_DOCS_ID = PROPERTIES.getProperty('GOOGLE_DOCS_ID');
//var doc = DocumentApp.openById(GOOGLE_DOCS_ID);
  
//-------------------------------
//トーク開始
//-------------------------------
function doPost(e) {
    var reply_token= JSON.parse(e.postData.contents).events[0].replyToken;
    if (typeof reply_token === 'undefined') {
        //var text = ”doPost error”;
        Logger.log("doPost error");
        return;
    }
  
    //メッセージ取得
    var com = JSON.parse(e.postData.contents).events[0].message.text;
    
    //スプレッドシートの設定
    var ss = SpreadsheetApp.openById('19vDth3AWactPsM0rALrP_gNFAfFOLzgdP0DRjyPhzUg');//スプレッドシート名（URL）
    var flag = ss.getRange('F1').getValue();//状態フラグ
    
    //変数設定
    var reply_messages;
    
    //フラグで状態を判断
    if(flag == 1){//「買ったよ」を言った後
    
        reply_messages = set_item_purchased_(com, ss);
    
    }else if(flag == 2){//「ほしい」を言った後
    
        reply_messages = set_item_purchase_list_(com, ss);
    
    }else{//それ以外
    
        reply_messages = command_purchase(com, ss, flag);
  
    }
    
    //返信設定
    var url = 'https://api.line.me/v2/bot/message/reply';
    UrlFetchApp.fetch(url, {
        'headers': {
            'Content-Type': 'application/json; charset=UTF-8',
            'Authorization': 'Bearer ' + LINE_ACCESS_TOKEN,
        },
        'method': 'post',
        'payload': JSON.stringify({
            'replyToken': reply_token,
            'messages': [{
                'type': 'text',
                'text': reply_messages,
            }],
        }),
    });

    return ContentService.createTextOutput(JSON.stringify({'content': 'post ok'})).setMimeType(ContentService.MimeType.JSON);
}
  
//-------------------------------
//コマンド分岐
//-------------------------------
function command_purchase(com, ss, flag)
{   
    Logger.log(String(com));
    
    //コマンドを識別し、返事をする
    if (String(com) == '買い物リスト'){
    
        return get_purchase_list_(ss);
    
    }else if(String(com) == '買ったよ') {
    
        ss.getRange('F1').setValue(1);
        return　'何を買ったの？';
    
    }else if (String(com) == 'ほしい'){
    
        ss.getRange('F1').setValue(2);
        return　'何がほしいの？';
        
    }else if (String(com) == 'ヘルプ'){
    
        return　'がんばって！！';
    
    }
    return '「買い物リスト」「買ったよ」「ほしい」のどれかで話しかけてね';  
}
  
//-------------------------------
//ほしいの処理
//-------------------------------
function set_item_purchase_list_(items, ss)
{
    ss.getRange('F1').setValue(0);
    
    //スプレッドシートの最終行を取得
    var lastRow = ss.getLastRow() + 1;
    
    // もし改行があったら分割して登録
    if( items.match(/[\n\r]/g) ){
    
        var item = items.split(/\r\n|\r|\n/);
    
        for (i = 0; i < item.length; i++) {
            ss.setActiveCell('A' + lastRow).setValue(item[i]);
            lastRow = lastRow + 1;
        }
    
    }else{//改行なし
    
        ss.setActiveCell('A' + lastRow).setValue(items);
    
    }
    
    return '買い物リストに追加しておいたよ！\nリストの内容を見るには「買い物リスト」って言ってね';
}
  
//-------------------------------
//買い物リストの処理
//-------------------------------
function get_purchase_list_(ss)
{
    var lastRow = ss.getLastRow(); //最終行
    var items = ss.getRange("A1:B" + lastRow).getValues();//登録された品目
    
    // 買い出しリストに登録がなければ後続処理を実行しない
    if (items.length < 1){
    
        ss.getRange('F1').setValue(1);
        return 'いま登録されている品目はないよ！\nほしいものがあったら「ほしい」で教えてね！';
  
    }
  
    var text = '買い物リストには、いま以下の品目が登録されてるよ！\n\n';
    var item_not_exist_flg = true;
    
    //済がついていない品目を表示する
    items.forEach(function(item){
        if (item[1] != '済'){
            item_not_exist_flg = false;
            text = text + String(item) + '\n';
        }
    });
    
    // 全て購入済ならリストに記載項目がない旨を返却
    if (item_not_exist_flg) {
    
        ss.getRange('F1').setValue(0);
        return 'いま登録されている品目はないよ！\nほしいものがあったら「ほしい」で教えてね！';
    
    }
    
    text = text + '\n買い出しが終わったら「買ったよ」で教えてね！';
    
    ss.getRange('F1').setValue(0);
    return text;
}
  
//-------------------------------
//買ったよの処理
//-------------------------------
function set_item_purchased_(purchased_items, ss)
{
  
    ss.getRange('F1').setValue(0);
    
    //スプレッドシートの最終行を取得
    var lastRow = ss.getLastRow();
    var items = ss.getRange("A1:B" + lastRow).getValues();
    
    //品目数
    var cnt = 0;
    
    //そもそもリストがなかった時の処理
    if (purchased_items.length < 1 || items.length < 1) {
    
        return '教えてもらった品目がリストに無いよ！\n「買い物リスト」でリストにある品目を確認してね';
    
    }
    
    // もし改行があったら分割して済にする
    if( purchased_items.match(/[\n\r]/g) ){
    
        var tarItem = purchased_items.split(/\r\n|\r|\n/);
    
        for (j = 0; j < tarItem.length; j++) {
        
            //改行：あったときに済にする
            for(var i=1 ;i <= lastRow; i++){
            
                var item = ss.getRange('A'+ i).getValue();
            
                if(tarItem[j] == item && ss.getRange('B'+i).getValue() == "" ){
            
                    ss.getRange('B'+ i).setValue('済');
                    cnt = cnt + 1;            
                }       
            }
    
        }//for(j)
    
    }else{
    
        //通常：あったときに済にする
        for(var i=1 ;i <= lastRow; i++){
        
            var item = ss.getRange('A'+ i).getValue();
            
            if(purchased_items == item && ss.getRange('B'+i).getValue() == "" ){
            
                ss.getRange('B'+ i).setValue('済');
                cnt = 1;        
            }
    
        }//比較for
    
    }//分割分岐
    
    //該当する品目がない
    if (cnt == 0){
    
        return '教えてもらった品目がリストに無いよ！\n「買い物リスト」でリストにある品目を確認してね';
    
    }else{
    
        return cnt+'品目をリストから削除しておいたよ～\n「買い物リスト」でリストにある品目を確認してね';
    
    }  
}