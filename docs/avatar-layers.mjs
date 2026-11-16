// Each published item must register its fitting profile. Keep source PNGs unchanged.
export const avatarAtlasSize=1254; // Compatibility only; new textures use the atlas registry.
export const avatarAssetsRoot="./assets/avatar-art/wardrobe-v1/";
export const avatarAtlases={
  "base": {
    "width": 1024,
    "height": 1536
  },
  "hair": {
    "width": 1254,
    "height": 1254
  },
  "hats": {
    "width": 1254,
    "height": 1254
  },
  "tops": {
    "width": 1254,
    "height": 1254
  },
  "bottoms": {
    "width": 1254,
    "height": 1254
  },
  "shoes": {
    "width": 1254,
    "height": 1254
  },
  "accessories": {
    "width": 1254,
    "height": 1254
  },
  "faces": {
    "width": 1254,
    "height": 1254
  }
};
export const avatarLayers={
  "hair-cocoa": {
    "atlas": "hair",
    "source": [
      96,
      60,
      462,
      450
    ],
    "target": [
      411,
      25,
      210,
      230
    ],
    "profile": "hair"
  },
  "hair-peach": {
    "atlas": "hair",
    "source": [
      693,
      62,
      480,
      444
    ],
    "target": [
      410,
      25,
      215,
      230
    ],
    "profile": "hair"
  },
  "hair-lilac": {
    "atlas": "hair",
    "source": [
      72,
      570,
      499,
      647
    ],
    "target": [
      365,
      20,
      290,
      325
    ],
    "profile": "hair"
  },
  "hair-silver": {
    "atlas": "hair",
    "source": [
      668,
      570,
      501,
      656
    ],
    "target": [
      353,
      5,
      265,
      345
    ],
    "profile": "hair"
  },
  "hat-beret": {
    "atlas": "hats",
    "source": [
      108,
      116,
      437,
      420
    ],
    "target": [
      395,
      -8,
      244,
      234
    ],
    "profile": "hat"
  },
  "hat-sprout": {
    "atlas": "hats",
    "source": [
      733,
      53,
      421,
      542
    ],
    "target": [
      405,
      -6,
      238,
      307
    ],
    "profile": "hat"
  },
  "hat-wizard": {
    "atlas": "hats",
    "source": [
      56,
      702,
      536,
      443
    ],
    "target": [
      363,
      -87,
      315,
      260
    ],
    "profile": "hat"
  },
  "top-stripe": {
    "atlas": "tops",
    "source": [
      142,
      62,
      361,
      483
    ],
    "target": [
      350,
      254,
      350,
      430
    ],
    "profile": "short-sleeve"
  },
  "top-mint": {
    "atlas": "tops",
    "source": [
      652,
      28,
      570,
      542
    ],
    "target": [
      241,
      244,
      565,
      489
    ],
    "profile": "long-sleeve"
  },
  "top-coral": {
    "atlas": "tops",
    "source": [
      38,
      681,
      557,
      504
    ],
    "target": [
      240,
      265,
      567,
      469
    ],
    "profile": "long-sleeve"
  },
  "top-night": {
    "atlas": "tops",
    "source": [
      709,
      652,
      460,
      584
    ],
    "target": [
      253,
      251,
      551,
      690
    ],
    "profile": "coat"
  },
  "bottom-denim": {
    "atlas": "bottoms",
    "source": [
      149,
      13,
      278,
      591
    ],
    "target": [
      298,
      628,
      391,
      741
    ],
    "profile": "pants"
  },
  "bottom-lilac": {
    "atlas": "bottoms",
    "source": [
      714,
      119,
      468,
      359
    ],
    "target": [
      320,
      620,
      450,
      260
    ],
    "profile": "shorts"
  },
  "bottom-check": {
    "atlas": "bottoms",
    "source": [
      63,
      756,
      504,
      363
    ],
    "target": [
      310,
      620,
      460,
      300
    ],
    "profile": "skirt"
  },
  "bottom-overall": {
    "atlas": "bottoms",
    "source": [
      797,
      637,
      243,
      605
    ],
    "target": [
      291,
      303,
      400,
      1067
    ],
    "profile": "overall"
  },
  "shoes-canvas": {
    "atlas": "shoes",
    "source": [
      51,
      145,
      530,
      362
    ],
    "target": [
      277,
      1354,
      433,
      154
    ],
    "profile": "low-shoe",
    "segments": [
      {
        "source": [
          51,
          145,
          181,
          362
        ],
        "target": [
          278,
          1354,
          112,
          154
        ]
      },
      {
        "source": [
          242,
          174,
          339,
          293
        ],
        "target": [
          549,
          1365,
          166,
          140
        ]
      }
    ]
  },
  "shoes-red": {
    "atlas": "shoes",
    "source": [
      676,
      110,
      539,
      409
    ],
    "target": [
      278,
      1308,
      435,
      201
    ],
    "profile": "boot",
    "segments": [
      {
        "source": [
          676,
          110,
          173,
          409
        ],
        "target": [
          278,
          1294,
          112,
          214
        ]
      },
      {
        "source": [
          875,
          122,
          340,
          357
        ],
        "target": [
          549,
          1302,
          166,
          197
        ]
      }
    ]
  },
  "shoes-lilac": {
    "atlas": "shoes",
    "source": [
      48,
      756,
      535,
      390
    ],
    "target": [
      277,
      1350,
      433,
      158
    ],
    "profile": "low-shoe",
    "segments": [
      {
        "source": [
          48,
          756,
          190,
          390
        ],
        "target": [
          278,
          1354,
          112,
          154
        ]
      },
      {
        "source": [
          244,
          772,
          339,
          333
        ],
        "target": [
          549,
          1365,
          166,
          140
        ]
      }
    ]
  },
  "shoes-star": {
    "atlas": "shoes",
    "source": [
      671,
      707,
      536,
      465
    ],
    "target": [
      277,
      1289,
      435,
      222
    ],
    "profile": "boot",
    "segments": [
      {
        "source": [
          671,
          707,
          180,
          465
        ],
        "target": [
          278,
          1294,
          112,
          214
        ]
      },
      {
        "source": [
          880,
          718,
          327,
          412
        ],
        "target": [
          549,
          1302,
          166,
          197
        ]
      }
    ]
  },
  "acc-bag": {
    "atlas": "accessories",
    "source": [
      150,
      70,
      393,
      517
    ],
    "target": [
      397,
      270,
      300,
      550
    ],
    "profile": "bag"
  },
  "acc-glasses": {
    "atlas": "accessories",
    "source": [
      706,
      250,
      478,
      193
    ],
    "target": [
      469,
      116,
      174,
      63
    ],
    "profile": "glasses",
    "segments": [
      {
        "source": [
          706,
          250,
          164,
          193
        ],
        "target": [
          469,
          116,
          55,
          63
        ]
      },
      {
        "source": [
          870,
          250,
          40,
          193
        ],
        "target": [
          524,
          116,
          27,
          63
        ]
      },
      {
        "source": [
          910,
          250,
          274,
          193
        ],
        "target": [
          551,
          116,
          92,
          63
        ]
      }
    ]
  },
  "acc-bird": {
    "atlas": "accessories",
    "source": [
      144,
      766,
      364,
      340
    ],
    "target": [
      302,
      199,
      109,
      102
    ],
    "profile": "bird"
  }
};
export const avatarFaceSources={"smile":[124,22,376,578],"sparkle":[751,22,376,578],"calm":[124,649,373,578]};
