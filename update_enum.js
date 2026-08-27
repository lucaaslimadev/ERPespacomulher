const { execSync } = require('child_process');
try {
  execSync(`docker exec erp-db psql -U erp -d erp_espaco_mulher -c "ALTER TYPE \\"PaymentMethod\\" ADD VALUE 'CREDIARIO';"`, { stdio: 'inherit' });
} catch (e) {
  console.log(e);
}
