/**
 * Created by Daniel on 05.06.2017.
 */

function populateTransactions(data){
    try {
        var cTransfers = categorizeTransactions(data.transfers, data.addresses);
        var tflat = [];
        for (var i = 0; i < cTransfers.sent.length; i++){
            var transferOut = cTransfers.sent[i][0];
            transferOut.direction = 'out';
            tflat.push(cTransfers.sent[i]);
        }

        for (var i = 0; i < cTransfers.received.length; i++){
            var transferIn = cTransfers.received[i][0];
            transferIn.direction = 'in';
            tflat.push(cTransfers.received[i]);
        }

        tflat.sort(function (x, y){
           return y[0].timestamp - x[0].timestamp;
        });

        transactionsToHtmlTable((document).getElementById('transaction_list'), tflat);
        $(".clickable-row").click(function() {
            openTransactionWindow($(this).attr("hashtimestamp"));
        });

        (document).getElementById('transaction_pager').innerHTML = "";
        $('#transaction_list').pageMe({pagerSelector:'#transaction_pager',showPrevNext:true,hidePageNumbers:false,perPage:10});
    }catch (err){
        alert(err);
    }
}

function transactionsToHtmlTable(table, transactions){
    table.innerHTML = "";
    var today = new Date().toDateString();

    for (var i = 0; i < transactions.length; i++){
        var tail = transactions[i][0];

        var row = table.insertRow(-1);
        row.classList.add('clickable-row');
        row.setAttribute('hashtimestamp', tail.hash + tail.timestamp.toString());
        var direction = row.insertCell(0);
        var date = row.insertCell(1);
        var value = row.insertCell(2);
        var status = row.insertCell(3);
        var category = row.insertCell(4);

        var d = new Date(tail.timestamp*1000);
        direction.innerHTML = tail.direction === 'in' ?
            "<span class='glyphicon glyphicon-chevron-right' style='color:#008000' title='Received'></span>" :
            "<span class='glyphicon glyphicon-chevron-left' style='color:#FF0000' title='Sent'></span>";
        date.innerHTML = today === d.toDateString() ? d.toLocaleTimeString() : d.toLocaleDateString();
        value.innerHTML = convertIotaValuesToHtml(tail.value);
        status.innerHTML = tail.persistence ? 'Completed' : 'Pending';

        if (false){// TODO: If the remaining balance == 0 and value > 0: Double spend (may have to use shouldResend)
            category.innerHTML = 'Double spend';
        }else if (true){// TODO:If bundle length = 1: Attach address
            category.innerHTML = 'Attach';
        }
    }
}

function openTransactionWindow(hashtimestamp) {
    $('#transactionModal').modal('show');

    var b;
    for (var i = 0; i < walletData.transfers.length; i++){
        var transfer = walletData.transfers[i][0];
        if (transfer.hash + transfer.timestamp.toString() === hashtimestamp){
            b = walletData.transfers[i];
            break;
        }
    }

    if (b === null){
        return document.getElementById('transaction-notifications').innerHTML = "<div class='alert alert-success'>Bundle \'" + hash + "\' not found</div>";
    }

    var tail = b[0];
    openTail = tail;
    document.getElementById('bundle_div').innerHTML = tail.bundle;
    document.getElementById('amount_div').innerHTML = 'You ' + (tail.direction === 'in' ? 'received' : 'sent') + ' <b>' + tail.value + '</b> IOTAs';
    document.getElementById('datetime_div').innerHTML = 'At ' + new Date(tail.timestamp*1000).toLocaleString();
    document.getElementById('status_div').innerHTML = tail.persistence ? 'Completed' : 'Pending';
    document.getElementById('message_div').innerHTML = getMessage(tail);
    bundleToHtmlTable(document.getElementById('bundle_list'), b);

    // Check if the user should replay by finding the sender address (with value < 0) and using the api
    // Also ignore incoming transfers, and let the sender deal with replaying
    $('#replay').hide();
    $('#double_spend_info').hide();
    if (!tail.persistence){
        b.forEach(function (t) {
            if (t.value < 0) {
                shouldReplay(t.address, shouldReplayCallback);
            }
        });
    }
}

function shouldReplayCallback(e, res){
    if (res){
        $('#replay').show();
    }else{
        $('#double_spend_info').show();
    }
}

function replaySelectedTransfer(btn){
    var tail_hash = document.getElementById('bundle_div').innerHTML;
    if (!tail_hash){
        return document.getElementById('transaction-notifications').innerHTML = "<div class='alert alert-danger'>" +
            "Could not load the transaction. Please contact support if this problem persists</div>";
    }

    replayBundle(openTail.hash, onReplaySelectedTransferCallback);

    var l = Ladda.create(btn);
    l.start();
}

function onReplaySelectedTransferCallback(e, res){
    Ladda.stopAll();

    if (e){
        return document.getElementById('transaction-notifications').innerHTML = "<div class='alert alert-danger'>Failed to re-attach. " + e.message + "</div>";
    }
    document.getElementById('transaction-notifications').innerHTML = "<div class='alert alert-success'>The transaction was re-attached</div>";;
}

function bundleToHtmlTable(table, bundle){
    table.innerHTML = "";
    bundle.forEach(function(t){
        var row = table.insertRow(-1);
        var value = row.insertCell(0);
        var address = row.insertCell(1);
        var hash = row.insertCell(2);

        value.innerHTML = t.value + ' IOTAs';
        address.innerHTML = t.address;
        hash.innerHTML = t.hash;
    });
}
