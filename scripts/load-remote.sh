#!/bin/bash
set -euo pipefail
FLAG="--remote"
EXPECTED_ROWS=419479

if [ ! -s scripts/seed.sql ]; then
  echo "scripts/seed.sql is missing or empty — run 'npm run ingest' first." >&2
  echo "Refusing to reload deficiencies without the matching facility seed." >&2
  exit 1
fi
if [ ! -s scripts/seed_deficiencies_setup.sql ] || [ ! -s scripts/seed_deficiencies_swap.sql ] || ! grep -q "INSERT INTO facility_deficiencies_next " scripts/seed_deficiencies_001.sql; then
  echo "Deficiency seed files predate the staged loader — run 'npm run ingest' to regenerate them." >&2
  exit 1
fi

d1() {
  npx wrangler d1 execute nursinghomegrade "$FLAG" --yes "$@"
}

# Prints the integer column n from a one-row query, or fails.
query_n() {
  d1 --json --command "$1" \
    | node -e 'let s="";process.stdin.on("data",(d)=>(s+=d)).on("end",()=>{const n=JSON.parse(s.slice(s.indexOf("[")))[0]?.results?.[0]?.n;if(!Number.isInteger(n)){console.error("Could not read a count");process.exit(1)}console.log(n)})'
}

count_rows() {
  query_n "SELECT COUNT(*) AS n FROM $1;"
}

setup_staging() {
  local attempt n
  for attempt in 1 2 3; do
    echo "Creating empty facility_deficiencies_next..."
    if d1 --file=scripts/seed_deficiencies_setup.sql; then return 0; fi
    n=$(count_rows facility_deficiencies_next) || n=""
    if [ "$n" = "0" ]; then
      echo "Staging setup applied despite the error above; continuing." >&2
      return 0
    fi
    sleep $((attempt * 5))
  done
  echo "Could not create facility_deficiencies_next. Live table untouched." >&2
  return 1
}

load_batch() {
  local file="$1" before="$2" after="$3" attempt n
  for attempt in 1 2 3; do
    echo "Loading $file..."
    if d1 --file="$file"; then return 0; fi
    n=$(count_rows facility_deficiencies_next) || n=""
    if [ "$n" = "$after" ]; then
      echo "$file applied despite the error above; continuing." >&2
      return 0
    fi
    if [ "$n" != "$before" ]; then
      echo "After $file the staging table has '$n' rows, expected $before or $after. Live table untouched." >&2
      return 1
    fi
    sleep $((attempt * 5))
  done
  echo "$file failed 3 times. Live table untouched." >&2
  return 1
}

swap_in() {
  local attempt
  for attempt in 1 2 3; do
    if d1 --file=scripts/seed_deficiencies_swap.sql; then return 0; fi
    if [ "$(query_n "SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name='facility_deficiencies_next';" || echo x)" = "0" ] \
      && [ "$(count_rows facility_deficiencies || echo x)" = "$1" ]; then
      echo "Swap applied despite the error above; continuing." >&2
      return 0
    fi
    sleep $((attempt * 5))
  done
  echo "Swap failed 3 times." >&2
  return 1
}

setup_staging
load_batch scripts/seed_deficiencies_001.sql 0 1000
load_batch scripts/seed_deficiencies_002.sql 1000 2000
load_batch scripts/seed_deficiencies_003.sql 2000 3000
load_batch scripts/seed_deficiencies_004.sql 3000 4000
load_batch scripts/seed_deficiencies_005.sql 4000 5000
load_batch scripts/seed_deficiencies_006.sql 5000 6000
load_batch scripts/seed_deficiencies_007.sql 6000 7000
load_batch scripts/seed_deficiencies_008.sql 7000 8000
load_batch scripts/seed_deficiencies_009.sql 8000 9000
load_batch scripts/seed_deficiencies_010.sql 9000 10000
load_batch scripts/seed_deficiencies_011.sql 10000 11000
load_batch scripts/seed_deficiencies_012.sql 11000 12000
load_batch scripts/seed_deficiencies_013.sql 12000 13000
load_batch scripts/seed_deficiencies_014.sql 13000 14000
load_batch scripts/seed_deficiencies_015.sql 14000 15000
load_batch scripts/seed_deficiencies_016.sql 15000 16000
load_batch scripts/seed_deficiencies_017.sql 16000 17000
load_batch scripts/seed_deficiencies_018.sql 17000 18000
load_batch scripts/seed_deficiencies_019.sql 18000 19000
load_batch scripts/seed_deficiencies_020.sql 19000 20000
load_batch scripts/seed_deficiencies_021.sql 20000 21000
load_batch scripts/seed_deficiencies_022.sql 21000 22000
load_batch scripts/seed_deficiencies_023.sql 22000 23000
load_batch scripts/seed_deficiencies_024.sql 23000 24000
load_batch scripts/seed_deficiencies_025.sql 24000 25000
load_batch scripts/seed_deficiencies_026.sql 25000 26000
load_batch scripts/seed_deficiencies_027.sql 26000 27000
load_batch scripts/seed_deficiencies_028.sql 27000 28000
load_batch scripts/seed_deficiencies_029.sql 28000 29000
load_batch scripts/seed_deficiencies_030.sql 29000 30000
load_batch scripts/seed_deficiencies_031.sql 30000 31000
load_batch scripts/seed_deficiencies_032.sql 31000 32000
load_batch scripts/seed_deficiencies_033.sql 32000 33000
load_batch scripts/seed_deficiencies_034.sql 33000 34000
load_batch scripts/seed_deficiencies_035.sql 34000 35000
load_batch scripts/seed_deficiencies_036.sql 35000 36000
load_batch scripts/seed_deficiencies_037.sql 36000 37000
load_batch scripts/seed_deficiencies_038.sql 37000 38000
load_batch scripts/seed_deficiencies_039.sql 38000 39000
load_batch scripts/seed_deficiencies_040.sql 39000 40000
load_batch scripts/seed_deficiencies_041.sql 40000 41000
load_batch scripts/seed_deficiencies_042.sql 41000 42000
load_batch scripts/seed_deficiencies_043.sql 42000 43000
load_batch scripts/seed_deficiencies_044.sql 43000 44000
load_batch scripts/seed_deficiencies_045.sql 44000 45000
load_batch scripts/seed_deficiencies_046.sql 45000 46000
load_batch scripts/seed_deficiencies_047.sql 46000 47000
load_batch scripts/seed_deficiencies_048.sql 47000 48000
load_batch scripts/seed_deficiencies_049.sql 48000 49000
load_batch scripts/seed_deficiencies_050.sql 49000 50000
load_batch scripts/seed_deficiencies_051.sql 50000 51000
load_batch scripts/seed_deficiencies_052.sql 51000 52000
load_batch scripts/seed_deficiencies_053.sql 52000 53000
load_batch scripts/seed_deficiencies_054.sql 53000 54000
load_batch scripts/seed_deficiencies_055.sql 54000 55000
load_batch scripts/seed_deficiencies_056.sql 55000 56000
load_batch scripts/seed_deficiencies_057.sql 56000 57000
load_batch scripts/seed_deficiencies_058.sql 57000 58000
load_batch scripts/seed_deficiencies_059.sql 58000 59000
load_batch scripts/seed_deficiencies_060.sql 59000 60000
load_batch scripts/seed_deficiencies_061.sql 60000 61000
load_batch scripts/seed_deficiencies_062.sql 61000 62000
load_batch scripts/seed_deficiencies_063.sql 62000 63000
load_batch scripts/seed_deficiencies_064.sql 63000 64000
load_batch scripts/seed_deficiencies_065.sql 64000 65000
load_batch scripts/seed_deficiencies_066.sql 65000 66000
load_batch scripts/seed_deficiencies_067.sql 66000 67000
load_batch scripts/seed_deficiencies_068.sql 67000 68000
load_batch scripts/seed_deficiencies_069.sql 68000 69000
load_batch scripts/seed_deficiencies_070.sql 69000 70000
load_batch scripts/seed_deficiencies_071.sql 70000 71000
load_batch scripts/seed_deficiencies_072.sql 71000 72000
load_batch scripts/seed_deficiencies_073.sql 72000 73000
load_batch scripts/seed_deficiencies_074.sql 73000 74000
load_batch scripts/seed_deficiencies_075.sql 74000 75000
load_batch scripts/seed_deficiencies_076.sql 75000 76000
load_batch scripts/seed_deficiencies_077.sql 76000 77000
load_batch scripts/seed_deficiencies_078.sql 77000 78000
load_batch scripts/seed_deficiencies_079.sql 78000 79000
load_batch scripts/seed_deficiencies_080.sql 79000 80000
load_batch scripts/seed_deficiencies_081.sql 80000 81000
load_batch scripts/seed_deficiencies_082.sql 81000 82000
load_batch scripts/seed_deficiencies_083.sql 82000 83000
load_batch scripts/seed_deficiencies_084.sql 83000 84000
load_batch scripts/seed_deficiencies_085.sql 84000 85000
load_batch scripts/seed_deficiencies_086.sql 85000 86000
load_batch scripts/seed_deficiencies_087.sql 86000 87000
load_batch scripts/seed_deficiencies_088.sql 87000 88000
load_batch scripts/seed_deficiencies_089.sql 88000 89000
load_batch scripts/seed_deficiencies_090.sql 89000 90000
load_batch scripts/seed_deficiencies_091.sql 90000 91000
load_batch scripts/seed_deficiencies_092.sql 91000 92000
load_batch scripts/seed_deficiencies_093.sql 92000 93000
load_batch scripts/seed_deficiencies_094.sql 93000 94000
load_batch scripts/seed_deficiencies_095.sql 94000 95000
load_batch scripts/seed_deficiencies_096.sql 95000 96000
load_batch scripts/seed_deficiencies_097.sql 96000 97000
load_batch scripts/seed_deficiencies_098.sql 97000 98000
load_batch scripts/seed_deficiencies_099.sql 98000 99000
load_batch scripts/seed_deficiencies_100.sql 99000 100000
load_batch scripts/seed_deficiencies_101.sql 100000 101000
load_batch scripts/seed_deficiencies_102.sql 101000 102000
load_batch scripts/seed_deficiencies_103.sql 102000 103000
load_batch scripts/seed_deficiencies_104.sql 103000 104000
load_batch scripts/seed_deficiencies_105.sql 104000 105000
load_batch scripts/seed_deficiencies_106.sql 105000 106000
load_batch scripts/seed_deficiencies_107.sql 106000 107000
load_batch scripts/seed_deficiencies_108.sql 107000 108000
load_batch scripts/seed_deficiencies_109.sql 108000 109000
load_batch scripts/seed_deficiencies_110.sql 109000 110000
load_batch scripts/seed_deficiencies_111.sql 110000 111000
load_batch scripts/seed_deficiencies_112.sql 111000 112000
load_batch scripts/seed_deficiencies_113.sql 112000 113000
load_batch scripts/seed_deficiencies_114.sql 113000 114000
load_batch scripts/seed_deficiencies_115.sql 114000 115000
load_batch scripts/seed_deficiencies_116.sql 115000 116000
load_batch scripts/seed_deficiencies_117.sql 116000 117000
load_batch scripts/seed_deficiencies_118.sql 117000 118000
load_batch scripts/seed_deficiencies_119.sql 118000 119000
load_batch scripts/seed_deficiencies_120.sql 119000 120000
load_batch scripts/seed_deficiencies_121.sql 120000 121000
load_batch scripts/seed_deficiencies_122.sql 121000 122000
load_batch scripts/seed_deficiencies_123.sql 122000 123000
load_batch scripts/seed_deficiencies_124.sql 123000 124000
load_batch scripts/seed_deficiencies_125.sql 124000 125000
load_batch scripts/seed_deficiencies_126.sql 125000 126000
load_batch scripts/seed_deficiencies_127.sql 126000 127000
load_batch scripts/seed_deficiencies_128.sql 127000 128000
load_batch scripts/seed_deficiencies_129.sql 128000 129000
load_batch scripts/seed_deficiencies_130.sql 129000 130000
load_batch scripts/seed_deficiencies_131.sql 130000 131000
load_batch scripts/seed_deficiencies_132.sql 131000 132000
load_batch scripts/seed_deficiencies_133.sql 132000 133000
load_batch scripts/seed_deficiencies_134.sql 133000 134000
load_batch scripts/seed_deficiencies_135.sql 134000 135000
load_batch scripts/seed_deficiencies_136.sql 135000 136000
load_batch scripts/seed_deficiencies_137.sql 136000 137000
load_batch scripts/seed_deficiencies_138.sql 137000 138000
load_batch scripts/seed_deficiencies_139.sql 138000 139000
load_batch scripts/seed_deficiencies_140.sql 139000 140000
load_batch scripts/seed_deficiencies_141.sql 140000 141000
load_batch scripts/seed_deficiencies_142.sql 141000 142000
load_batch scripts/seed_deficiencies_143.sql 142000 143000
load_batch scripts/seed_deficiencies_144.sql 143000 144000
load_batch scripts/seed_deficiencies_145.sql 144000 145000
load_batch scripts/seed_deficiencies_146.sql 145000 146000
load_batch scripts/seed_deficiencies_147.sql 146000 147000
load_batch scripts/seed_deficiencies_148.sql 147000 148000
load_batch scripts/seed_deficiencies_149.sql 148000 149000
load_batch scripts/seed_deficiencies_150.sql 149000 150000
load_batch scripts/seed_deficiencies_151.sql 150000 151000
load_batch scripts/seed_deficiencies_152.sql 151000 152000
load_batch scripts/seed_deficiencies_153.sql 152000 153000
load_batch scripts/seed_deficiencies_154.sql 153000 154000
load_batch scripts/seed_deficiencies_155.sql 154000 155000
load_batch scripts/seed_deficiencies_156.sql 155000 156000
load_batch scripts/seed_deficiencies_157.sql 156000 157000
load_batch scripts/seed_deficiencies_158.sql 157000 158000
load_batch scripts/seed_deficiencies_159.sql 158000 159000
load_batch scripts/seed_deficiencies_160.sql 159000 160000
load_batch scripts/seed_deficiencies_161.sql 160000 161000
load_batch scripts/seed_deficiencies_162.sql 161000 162000
load_batch scripts/seed_deficiencies_163.sql 162000 163000
load_batch scripts/seed_deficiencies_164.sql 163000 164000
load_batch scripts/seed_deficiencies_165.sql 164000 165000
load_batch scripts/seed_deficiencies_166.sql 165000 166000
load_batch scripts/seed_deficiencies_167.sql 166000 167000
load_batch scripts/seed_deficiencies_168.sql 167000 168000
load_batch scripts/seed_deficiencies_169.sql 168000 169000
load_batch scripts/seed_deficiencies_170.sql 169000 170000
load_batch scripts/seed_deficiencies_171.sql 170000 171000
load_batch scripts/seed_deficiencies_172.sql 171000 172000
load_batch scripts/seed_deficiencies_173.sql 172000 173000
load_batch scripts/seed_deficiencies_174.sql 173000 174000
load_batch scripts/seed_deficiencies_175.sql 174000 175000
load_batch scripts/seed_deficiencies_176.sql 175000 176000
load_batch scripts/seed_deficiencies_177.sql 176000 177000
load_batch scripts/seed_deficiencies_178.sql 177000 178000
load_batch scripts/seed_deficiencies_179.sql 178000 179000
load_batch scripts/seed_deficiencies_180.sql 179000 180000
load_batch scripts/seed_deficiencies_181.sql 180000 181000
load_batch scripts/seed_deficiencies_182.sql 181000 182000
load_batch scripts/seed_deficiencies_183.sql 182000 183000
load_batch scripts/seed_deficiencies_184.sql 183000 184000
load_batch scripts/seed_deficiencies_185.sql 184000 185000
load_batch scripts/seed_deficiencies_186.sql 185000 186000
load_batch scripts/seed_deficiencies_187.sql 186000 187000
load_batch scripts/seed_deficiencies_188.sql 187000 188000
load_batch scripts/seed_deficiencies_189.sql 188000 189000
load_batch scripts/seed_deficiencies_190.sql 189000 190000
load_batch scripts/seed_deficiencies_191.sql 190000 191000
load_batch scripts/seed_deficiencies_192.sql 191000 192000
load_batch scripts/seed_deficiencies_193.sql 192000 193000
load_batch scripts/seed_deficiencies_194.sql 193000 194000
load_batch scripts/seed_deficiencies_195.sql 194000 195000
load_batch scripts/seed_deficiencies_196.sql 195000 196000
load_batch scripts/seed_deficiencies_197.sql 196000 197000
load_batch scripts/seed_deficiencies_198.sql 197000 198000
load_batch scripts/seed_deficiencies_199.sql 198000 199000
load_batch scripts/seed_deficiencies_200.sql 199000 200000
load_batch scripts/seed_deficiencies_201.sql 200000 201000
load_batch scripts/seed_deficiencies_202.sql 201000 202000
load_batch scripts/seed_deficiencies_203.sql 202000 203000
load_batch scripts/seed_deficiencies_204.sql 203000 204000
load_batch scripts/seed_deficiencies_205.sql 204000 205000
load_batch scripts/seed_deficiencies_206.sql 205000 206000
load_batch scripts/seed_deficiencies_207.sql 206000 207000
load_batch scripts/seed_deficiencies_208.sql 207000 208000
load_batch scripts/seed_deficiencies_209.sql 208000 209000
load_batch scripts/seed_deficiencies_210.sql 209000 210000
load_batch scripts/seed_deficiencies_211.sql 210000 211000
load_batch scripts/seed_deficiencies_212.sql 211000 212000
load_batch scripts/seed_deficiencies_213.sql 212000 213000
load_batch scripts/seed_deficiencies_214.sql 213000 214000
load_batch scripts/seed_deficiencies_215.sql 214000 215000
load_batch scripts/seed_deficiencies_216.sql 215000 216000
load_batch scripts/seed_deficiencies_217.sql 216000 217000
load_batch scripts/seed_deficiencies_218.sql 217000 218000
load_batch scripts/seed_deficiencies_219.sql 218000 219000
load_batch scripts/seed_deficiencies_220.sql 219000 220000
load_batch scripts/seed_deficiencies_221.sql 220000 221000
load_batch scripts/seed_deficiencies_222.sql 221000 222000
load_batch scripts/seed_deficiencies_223.sql 222000 223000
load_batch scripts/seed_deficiencies_224.sql 223000 224000
load_batch scripts/seed_deficiencies_225.sql 224000 225000
load_batch scripts/seed_deficiencies_226.sql 225000 226000
load_batch scripts/seed_deficiencies_227.sql 226000 227000
load_batch scripts/seed_deficiencies_228.sql 227000 228000
load_batch scripts/seed_deficiencies_229.sql 228000 229000
load_batch scripts/seed_deficiencies_230.sql 229000 230000
load_batch scripts/seed_deficiencies_231.sql 230000 231000
load_batch scripts/seed_deficiencies_232.sql 231000 232000
load_batch scripts/seed_deficiencies_233.sql 232000 233000
load_batch scripts/seed_deficiencies_234.sql 233000 234000
load_batch scripts/seed_deficiencies_235.sql 234000 235000
load_batch scripts/seed_deficiencies_236.sql 235000 236000
load_batch scripts/seed_deficiencies_237.sql 236000 237000
load_batch scripts/seed_deficiencies_238.sql 237000 238000
load_batch scripts/seed_deficiencies_239.sql 238000 239000
load_batch scripts/seed_deficiencies_240.sql 239000 240000
load_batch scripts/seed_deficiencies_241.sql 240000 241000
load_batch scripts/seed_deficiencies_242.sql 241000 242000
load_batch scripts/seed_deficiencies_243.sql 242000 243000
load_batch scripts/seed_deficiencies_244.sql 243000 244000
load_batch scripts/seed_deficiencies_245.sql 244000 245000
load_batch scripts/seed_deficiencies_246.sql 245000 246000
load_batch scripts/seed_deficiencies_247.sql 246000 247000
load_batch scripts/seed_deficiencies_248.sql 247000 248000
load_batch scripts/seed_deficiencies_249.sql 248000 249000
load_batch scripts/seed_deficiencies_250.sql 249000 250000
load_batch scripts/seed_deficiencies_251.sql 250000 251000
load_batch scripts/seed_deficiencies_252.sql 251000 252000
load_batch scripts/seed_deficiencies_253.sql 252000 253000
load_batch scripts/seed_deficiencies_254.sql 253000 254000
load_batch scripts/seed_deficiencies_255.sql 254000 255000
load_batch scripts/seed_deficiencies_256.sql 255000 256000
load_batch scripts/seed_deficiencies_257.sql 256000 257000
load_batch scripts/seed_deficiencies_258.sql 257000 258000
load_batch scripts/seed_deficiencies_259.sql 258000 259000
load_batch scripts/seed_deficiencies_260.sql 259000 260000
load_batch scripts/seed_deficiencies_261.sql 260000 261000
load_batch scripts/seed_deficiencies_262.sql 261000 262000
load_batch scripts/seed_deficiencies_263.sql 262000 263000
load_batch scripts/seed_deficiencies_264.sql 263000 264000
load_batch scripts/seed_deficiencies_265.sql 264000 265000
load_batch scripts/seed_deficiencies_266.sql 265000 266000
load_batch scripts/seed_deficiencies_267.sql 266000 267000
load_batch scripts/seed_deficiencies_268.sql 267000 268000
load_batch scripts/seed_deficiencies_269.sql 268000 269000
load_batch scripts/seed_deficiencies_270.sql 269000 270000
load_batch scripts/seed_deficiencies_271.sql 270000 271000
load_batch scripts/seed_deficiencies_272.sql 271000 272000
load_batch scripts/seed_deficiencies_273.sql 272000 273000
load_batch scripts/seed_deficiencies_274.sql 273000 274000
load_batch scripts/seed_deficiencies_275.sql 274000 275000
load_batch scripts/seed_deficiencies_276.sql 275000 276000
load_batch scripts/seed_deficiencies_277.sql 276000 277000
load_batch scripts/seed_deficiencies_278.sql 277000 278000
load_batch scripts/seed_deficiencies_279.sql 278000 279000
load_batch scripts/seed_deficiencies_280.sql 279000 280000
load_batch scripts/seed_deficiencies_281.sql 280000 281000
load_batch scripts/seed_deficiencies_282.sql 281000 282000
load_batch scripts/seed_deficiencies_283.sql 282000 283000
load_batch scripts/seed_deficiencies_284.sql 283000 284000
load_batch scripts/seed_deficiencies_285.sql 284000 285000
load_batch scripts/seed_deficiencies_286.sql 285000 286000
load_batch scripts/seed_deficiencies_287.sql 286000 287000
load_batch scripts/seed_deficiencies_288.sql 287000 288000
load_batch scripts/seed_deficiencies_289.sql 288000 289000
load_batch scripts/seed_deficiencies_290.sql 289000 290000
load_batch scripts/seed_deficiencies_291.sql 290000 291000
load_batch scripts/seed_deficiencies_292.sql 291000 292000
load_batch scripts/seed_deficiencies_293.sql 292000 293000
load_batch scripts/seed_deficiencies_294.sql 293000 294000
load_batch scripts/seed_deficiencies_295.sql 294000 295000
load_batch scripts/seed_deficiencies_296.sql 295000 296000
load_batch scripts/seed_deficiencies_297.sql 296000 297000
load_batch scripts/seed_deficiencies_298.sql 297000 298000
load_batch scripts/seed_deficiencies_299.sql 298000 299000
load_batch scripts/seed_deficiencies_300.sql 299000 300000
load_batch scripts/seed_deficiencies_301.sql 300000 301000
load_batch scripts/seed_deficiencies_302.sql 301000 302000
load_batch scripts/seed_deficiencies_303.sql 302000 303000
load_batch scripts/seed_deficiencies_304.sql 303000 304000
load_batch scripts/seed_deficiencies_305.sql 304000 305000
load_batch scripts/seed_deficiencies_306.sql 305000 306000
load_batch scripts/seed_deficiencies_307.sql 306000 307000
load_batch scripts/seed_deficiencies_308.sql 307000 308000
load_batch scripts/seed_deficiencies_309.sql 308000 309000
load_batch scripts/seed_deficiencies_310.sql 309000 310000
load_batch scripts/seed_deficiencies_311.sql 310000 311000
load_batch scripts/seed_deficiencies_312.sql 311000 312000
load_batch scripts/seed_deficiencies_313.sql 312000 313000
load_batch scripts/seed_deficiencies_314.sql 313000 314000
load_batch scripts/seed_deficiencies_315.sql 314000 315000
load_batch scripts/seed_deficiencies_316.sql 315000 316000
load_batch scripts/seed_deficiencies_317.sql 316000 317000
load_batch scripts/seed_deficiencies_318.sql 317000 318000
load_batch scripts/seed_deficiencies_319.sql 318000 319000
load_batch scripts/seed_deficiencies_320.sql 319000 320000
load_batch scripts/seed_deficiencies_321.sql 320000 321000
load_batch scripts/seed_deficiencies_322.sql 321000 322000
load_batch scripts/seed_deficiencies_323.sql 322000 323000
load_batch scripts/seed_deficiencies_324.sql 323000 324000
load_batch scripts/seed_deficiencies_325.sql 324000 325000
load_batch scripts/seed_deficiencies_326.sql 325000 326000
load_batch scripts/seed_deficiencies_327.sql 326000 327000
load_batch scripts/seed_deficiencies_328.sql 327000 328000
load_batch scripts/seed_deficiencies_329.sql 328000 329000
load_batch scripts/seed_deficiencies_330.sql 329000 330000
load_batch scripts/seed_deficiencies_331.sql 330000 331000
load_batch scripts/seed_deficiencies_332.sql 331000 332000
load_batch scripts/seed_deficiencies_333.sql 332000 333000
load_batch scripts/seed_deficiencies_334.sql 333000 334000
load_batch scripts/seed_deficiencies_335.sql 334000 335000
load_batch scripts/seed_deficiencies_336.sql 335000 336000
load_batch scripts/seed_deficiencies_337.sql 336000 337000
load_batch scripts/seed_deficiencies_338.sql 337000 338000
load_batch scripts/seed_deficiencies_339.sql 338000 339000
load_batch scripts/seed_deficiencies_340.sql 339000 340000
load_batch scripts/seed_deficiencies_341.sql 340000 341000
load_batch scripts/seed_deficiencies_342.sql 341000 342000
load_batch scripts/seed_deficiencies_343.sql 342000 343000
load_batch scripts/seed_deficiencies_344.sql 343000 344000
load_batch scripts/seed_deficiencies_345.sql 344000 345000
load_batch scripts/seed_deficiencies_346.sql 345000 346000
load_batch scripts/seed_deficiencies_347.sql 346000 347000
load_batch scripts/seed_deficiencies_348.sql 347000 348000
load_batch scripts/seed_deficiencies_349.sql 348000 349000
load_batch scripts/seed_deficiencies_350.sql 349000 350000
load_batch scripts/seed_deficiencies_351.sql 350000 351000
load_batch scripts/seed_deficiencies_352.sql 351000 352000
load_batch scripts/seed_deficiencies_353.sql 352000 353000
load_batch scripts/seed_deficiencies_354.sql 353000 354000
load_batch scripts/seed_deficiencies_355.sql 354000 355000
load_batch scripts/seed_deficiencies_356.sql 355000 356000
load_batch scripts/seed_deficiencies_357.sql 356000 357000
load_batch scripts/seed_deficiencies_358.sql 357000 358000
load_batch scripts/seed_deficiencies_359.sql 358000 359000
load_batch scripts/seed_deficiencies_360.sql 359000 360000
load_batch scripts/seed_deficiencies_361.sql 360000 361000
load_batch scripts/seed_deficiencies_362.sql 361000 362000
load_batch scripts/seed_deficiencies_363.sql 362000 363000
load_batch scripts/seed_deficiencies_364.sql 363000 364000
load_batch scripts/seed_deficiencies_365.sql 364000 365000
load_batch scripts/seed_deficiencies_366.sql 365000 366000
load_batch scripts/seed_deficiencies_367.sql 366000 367000
load_batch scripts/seed_deficiencies_368.sql 367000 368000
load_batch scripts/seed_deficiencies_369.sql 368000 369000
load_batch scripts/seed_deficiencies_370.sql 369000 370000
load_batch scripts/seed_deficiencies_371.sql 370000 371000
load_batch scripts/seed_deficiencies_372.sql 371000 372000
load_batch scripts/seed_deficiencies_373.sql 372000 373000
load_batch scripts/seed_deficiencies_374.sql 373000 374000
load_batch scripts/seed_deficiencies_375.sql 374000 375000
load_batch scripts/seed_deficiencies_376.sql 375000 376000
load_batch scripts/seed_deficiencies_377.sql 376000 377000
load_batch scripts/seed_deficiencies_378.sql 377000 378000
load_batch scripts/seed_deficiencies_379.sql 378000 379000
load_batch scripts/seed_deficiencies_380.sql 379000 380000
load_batch scripts/seed_deficiencies_381.sql 380000 381000
load_batch scripts/seed_deficiencies_382.sql 381000 382000
load_batch scripts/seed_deficiencies_383.sql 382000 383000
load_batch scripts/seed_deficiencies_384.sql 383000 384000
load_batch scripts/seed_deficiencies_385.sql 384000 385000
load_batch scripts/seed_deficiencies_386.sql 385000 386000
load_batch scripts/seed_deficiencies_387.sql 386000 387000
load_batch scripts/seed_deficiencies_388.sql 387000 388000
load_batch scripts/seed_deficiencies_389.sql 388000 389000
load_batch scripts/seed_deficiencies_390.sql 389000 390000
load_batch scripts/seed_deficiencies_391.sql 390000 391000
load_batch scripts/seed_deficiencies_392.sql 391000 392000
load_batch scripts/seed_deficiencies_393.sql 392000 393000
load_batch scripts/seed_deficiencies_394.sql 393000 394000
load_batch scripts/seed_deficiencies_395.sql 394000 395000
load_batch scripts/seed_deficiencies_396.sql 395000 396000
load_batch scripts/seed_deficiencies_397.sql 396000 397000
load_batch scripts/seed_deficiencies_398.sql 397000 398000
load_batch scripts/seed_deficiencies_399.sql 398000 399000
load_batch scripts/seed_deficiencies_400.sql 399000 400000
load_batch scripts/seed_deficiencies_401.sql 400000 401000
load_batch scripts/seed_deficiencies_402.sql 401000 402000
load_batch scripts/seed_deficiencies_403.sql 402000 403000
load_batch scripts/seed_deficiencies_404.sql 403000 404000
load_batch scripts/seed_deficiencies_405.sql 404000 405000
load_batch scripts/seed_deficiencies_406.sql 405000 406000
load_batch scripts/seed_deficiencies_407.sql 406000 407000
load_batch scripts/seed_deficiencies_408.sql 407000 408000
load_batch scripts/seed_deficiencies_409.sql 408000 409000
load_batch scripts/seed_deficiencies_410.sql 409000 410000
load_batch scripts/seed_deficiencies_411.sql 410000 411000
load_batch scripts/seed_deficiencies_412.sql 411000 412000
load_batch scripts/seed_deficiencies_413.sql 412000 413000
load_batch scripts/seed_deficiencies_414.sql 413000 414000
load_batch scripts/seed_deficiencies_415.sql 414000 415000
load_batch scripts/seed_deficiencies_416.sql 415000 416000
load_batch scripts/seed_deficiencies_417.sql 416000 417000
load_batch scripts/seed_deficiencies_418.sql 417000 418000
load_batch scripts/seed_deficiencies_419.sql 418000 419000
load_batch scripts/seed_deficiencies_420.sql 419000 419479

STAGED=$(count_rows facility_deficiencies_next)
if [ "$STAGED" -ne "$EXPECTED_ROWS" ]; then
  echo "Staged $STAGED deficiency rows, expected $EXPECTED_ROWS. Live table left untouched." >&2
  exit 1
fi
LIVE=$(count_rows facility_deficiencies)
if [ $((STAGED * 2)) -lt "$LIVE" ] && [ "${ALLOW_DEFICIENCY_SHRINK:-}" != "1" ]; then
  echo "Staged $STAGED rows is under half of the $LIVE live rows. Set ALLOW_DEFICIENCY_SHRINK=1 to accept." >&2
  exit 1
fi

echo "Verified $STAGED staged rows (live had $LIVE). Swapping into place..."
swap_in "$STAGED"

echo "Loading facilities and grades..."
d1 --file=scripts/seed.sql
echo "Done!"
