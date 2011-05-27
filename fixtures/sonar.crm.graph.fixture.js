var nodes = {
    "28533": {
        "ie": 0,
        "ic": 0,
        "oe": 2,
        "oc": 2,
        "w": 0.002,
        "us": 0.333333333333333,
        "ws": 0.333333333333333,
        "activity": 20,
        "dirty": null,
        "domain_org_part": "mccann",
        "id": 28533,
        "link_activity": 1,
        "link_earliest": "2008-10-03 14:01:25.0",
        "link_id": "12735",
        "link_latest": "2008-10-03 14:01:25.0",
        "link_rx": null,
        "link_tx": null,
        "metric_foreign_components": 4,
        "metric_influence": 1,
        "metric_metadata": 1,
        "metric_resilience": 1,
        "metric_responsiveness": 1,
        "name": "McCann Worldgroup",
        "num_contacts": 14,
        "num_decision_makers": 0,
        "num_home_org_contacts": 9,
        "num_other_org_contacts": 7,
        "web_url": "http://www.mccann.com",
        "type": "org",
        "kind": "partner",
        "context_relation": 0.001,
        "home_relation": 0.001
    },
    "27885": {
        "ie": 1,
        "ic": 1,
        "oe": 0,
        "oc": 0,
        "w": 0.001,
        "us": 0.333333333333333,
        "ws": 0.333333333333333,
        "id": 27885,
        "name": "Trampoline Systems",
        "web_url": "http://www.trampolinesystems.com",
        "nodata": true,
        "type": "org",
        "kind": "internal",
        "context_relation": 0,
        "home_relation": 0,
        "activity": 20
    },
    "41253": {
        "ie": 1,
        "ic": 1,
        "oe": 0,
        "oc": 0,
        "w": 0.001,
        "us": 0.333333333333333,
        "ws": 0.333333333333333,
        "activity": 20,
        "dirty": null,
        "domain_org_part": "ups",
        "id": 41253,
        "link_activity": 1,
        "link_earliest": "2008-10-03 14:01:25.0",
        "link_id": "12736",
        "link_latest": "2008-10-03 14:01:25.0",
        "link_rx": null,
        "link_tx": null,
        "metric_foreign_components": 4,
        "metric_influence": 1,
        "metric_metadata": 1,
        "metric_resilience": 1,
        "metric_responsiveness": 5,
        "name": "ups",
        "num_contacts": 2,
        "num_decision_makers": 0,
        "num_home_org_contacts": 3,
        "num_other_org_contacts": 3,
        "web_url": "http://www.ups.com",
        "type": "org",
        "kind": "external",
        "context_relation": 0,
        "home_relation": 0
    }
};

var edges = {
    "28533": {
        "27885": {
            "c": 1,
            "w": 0.001
        },
        "41253": {
            "c": 1,
            "w": 0.001
        }
    },
    "27885": {
        "28533": {
            "c": 0,
            "w": 0.001
        }
    },
    "41253": {
        "28533": {
            "c": 0,
            "w": 0.001
        }
    }
};