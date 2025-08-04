import time
import json

# JSON output based on the parsed data from dp_inputdata.pdf
output = {
    "id": f"config_{int(time.time() * 1000)}_dp_conversion",
    "name": "Display Pallet Example",
    "description": "Converted from dp_inputdata.pdf",
    "timestamp": int(time.time() * 1000),
    "data": {
        "problemName": "Display Pallet Example",
        "user": "PDF Import",
        "unitOfMeasure": "METRIC",
        "products": [
            {
                "id": 1,
                "name": "Std. Box",
                "tag": "Label 1",
                "type": "STANDARD_BOX",
                "dimensions": {
                    "length": 350.0,
                    "width": 300.0,
                    "height": 250.0
                },
                "weight": 15.0,
                "color": 0x8B4513,  # brown
                "quantity": {
                    "min": 1,
                    "max": 25
                },
                "orientationRules": {
                    "allowLengthVertical": True,
                    "allowWidthVertical": True,
                    "allowHeightVertical": True
                },
                "stackingRules": {
                    "stackingCodeOrPriority": 0,
                    "maxInColumn": 10,
                    "mustNotStackOnBase": False,
                    "mustStackTogether": False
                }
            },
            {
                "id": 2,
                "name": "Case",
                "tag": "Label 2",
                "type": "RSC_BOX",
                "dimensions": {
                    "length": 350.0,
                    "width": 200.0,
                    "height": 250.0
                },
                "weight": 20.0,
                "color": 0x00FFFF,  # cyan
                "quantity": {
                    "min": 1,
                    "max": 30
                },
                "orientationRules": {
                    "allowLengthVertical": True,
                    "allowWidthVertical": True,
                    "allowHeightVertical": True
                },
                "stackingRules": {
                    "stackingCodeOrPriority": 0,
                    "maxInColumn": 10,
                    "mustNotStackOnBase": False,
                    "mustStackTogether": False
                }
            },
            {
                "id": 3,
                "name": "Box",
                "tag": "Label 3",
                "type": "END_LOADER_BOX",
                "dimensions": {
                    "length": 450.0,
                    "width": 350.0,
                    "height": 400.0
                },
                "weight": 20.0,
                "color": 0x00FF00,  # green
                "quantity": {
                    "min": 1,
                    "max": 35
                },
                "orientationRules": {
                    "allowLengthVertical": True,
                    "allowWidthVertical": True,
                    "allowHeightVertical": True
                },
                "stackingRules": {
                    "stackingCodeOrPriority": 0,
                    "maxInColumn": 10,
                    "mustNotStackOnBase": False,
                    "mustStackTogether": False
                }
            }
        ],
        "pallet": {
            "name": "UKSTD",
            "dimensions": {
                "length": 1200.0,
                "width": 1000.0,
                "height": 150.0
            },
            "weight": 25.0,
            "loadConstraints": {
                "maxLoadHeight": 1650.0,
                "maxLoadWeight": 975.0,
                "maxProductQuantity": 0,
                "overhang": {
                    "length": 0.0,
                    "width": 0.0
                },
                "centerOfGravity": {
                    "height": 825.0,
                    "radius": 500.0
                }
            }
        },
        "settings": {
            "algorithm": "COLUMN_ALGORITHM",
            "optimizationType": "SINGLE_PALLET",
            "stackingRulesType": "NO_WALLS_REQUIRED",
            "timeLimitPerStrategyInSeconds": 6,
            "algorithmSettings": {
                "@type": "column",
                "allowMixedColumnsInSinglePallet": False
            }
        }
    }
}

# Save to a file for user download
output_path = "D:\my-projects\one-page-tests\gpt-o3-high\converted_dp_inputdata.json"
with open(output_path, "w") as f:
    json.dump(output, f, indent=2)

output_path
