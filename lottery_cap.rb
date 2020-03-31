require 'json'

def get_all_events
  start_block, end_block = [7077544, 9564204]
  # start_block, end_block = [7077544, 7077544+100000]
  relevant_events = []
  cur_block = start_block
  curl_cmd = 'curl -X GET "https://cds.securitize.io/v1/token_contracts/0x82017d0409fb4ea27d4ae799c9e3b9b4f847c837/events?fromBlock=%s&toBlock=%s" -H "accept: application/json"'
  while cur_block < end_block do
    cur_end_block = cur_block + 4999
    puts "Getting events from #{cur_block} to #{cur_end_block}"
    begin
      curl_out = `#{curl_cmd % [cur_block.to_s, cur_end_block.to_s]}`
      events_json = JSON.parse(curl_out)
      new_events = events_json["events"].select { |event| ["Transfer", "Issue", "Burn", "Seize"].include? event["eventType"] }
      puts "Found #{new_events.length} new events out of #{events_json["events"].length}"
      relevant_events += new_events
      sleep 1
      cur_block += 5000
    rescue Exception => e
      sleep 10
    end
  end
  relevant_events
end


def convert_all_events_to_transfer(events)
  events_dup = events.dup
  events_dup.map do |event|
    if event["eventType"] == "Burn"
      event["parameters"]["from"] = event["parameters"]["burner"]
      event["parameters"]["to"] = "0"
      event["eventType"] = 'Transfer'
    elsif event["eventType"] == "Issue"
      event["parameters"]["from"] = "0"
      event["eventType"] = 'Transfer'
    end
    event
  end
  events_dup
end

def calc_balances(transfer_events)
  balances = Hash.new(0)
  transfer_events.each do |te|
    if te["parameters"]["from"] != "0"
      balances[te["parameters"]["from"]] -= te["parameters"]["value"].to_i
    end

    if te["parameters"]["to"] != "0"
      balances[te["parameters"]["to"]] += te["parameters"]["value"].to_i
    end
  end
  balances
end