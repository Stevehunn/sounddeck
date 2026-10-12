module.exports = {
  // Webhook par défaut — utilisé si aucun webhook par type n'est défini
  default: 'https://discord.com/api/webhooks/1553879133539274783/3ZGHUhAhMm0y29uP3OamqON7MbudAUN0t2m-LpcyTlKcHX7Tnf_rXPbePQG-Oq-99eBV',

  // Webhooks par type (optionnels) — écrasent le webhook par défaut
  perType: {
    bug: 'https://discord.com/api/webhooks/1553882717442015283/8z4pVcKUI5MITHVqNuay91rErAm5t2m8eP5IZdsfYUHecSALxxb7CFGXRvmt-hcrqpzR',
    feature: 'https://discord.com/api/webhooks/1553882828310323211/xxOnVDYsKRH4824LILs4TevOCDYxKZj1SnS7u53Zy1yAwCyCCFHKn_mSFlb0u9RDMhHh',
    question: 'https://discord.com/api/webhooks/1553882932525932708/ThVf103WvygHhB-6W4yTUeYnc9uMB5j5Hl8yiaZOwr-zod3GRdzR08Q6eQ5pCS5nCDCY',
    praise: 'https://discord.com/api/webhooks/1553883025098539119/r8ZPzol33kUWMJqwA34R0hsPlblYWgDaJTHkppRoZKTs_BmkXEXDwi4FGrwqkz01fsxh',
  },
}